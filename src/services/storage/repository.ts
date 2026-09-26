import {
  clockKey,
  getDB,
  inferClock,
  META_KEYS,
  RECORD_TABLES,
  type MetaKey,
  type MovieTrackerDB,
  type RecordTable,
  type SyncClock,
  type SyncState,
  type SyncTable,
} from './db'
import type {
  CustomList,
  EpisodeProgress,
  FavoritePerson,
  LibraryEntry,
  Rating,
  Review,
  WatchRecord,
} from '@/types/watch'
import type { MediaSummary } from '@/types/media'
import type { ApiConfig, UserProfile, UserSettings } from '@/types/user'

/**
 * The only module in the app allowed to know that IndexedDB exists.
 * Stores (src/store) call these functions and hold the reactive copy in
 * memory; components never import this file directly.
 *
 * Every write to user data also writes that record's clock (see SyncClock)
 * in the same transaction, and every delete leaves a tombstone clock behind
 * instead of just vanishing - that's what lets the sync engine merge two
 * devices record by record, and propagate deletions, without ever asking
 * the user which copy to keep.
 */

type RecordValue<T extends RecordTable> = MovieTrackerDB[T]['value']
type MetaValue = UserProfile | UserSettings | ApiConfig

/** One record in a sync snapshot: id, clock, and either the value or a
 * deletion marker. Short keys because there can be thousands of these. */
export interface SnapshotRecord {
  i: string
  t: number
  v?: unknown
  d?: 1
}

/** The whole account as stored on Drive. */
export interface SyncSnapshot {
  app: 'movie-tracker'
  schema: number
  epoch: string
  writtenAt: number
  tables: Partial<Record<SyncTable, SnapshotRecord[]>>
  /** TMDB metadata for everything the data above references, so a fresh
   * device shows real titles and posters immediately. Not user data - a
   * gap-filler, never merged by clock. */
  media: MediaSummary[]
}

export const SNAPSHOT_SCHEMA = 1

/** Minimal structural view of an object store, for code that picks the
 * store by name at runtime (idb's typings can't follow a variable name). */
interface LooseStore {
  put(value: unknown, key?: string): Promise<unknown>
  delete(key: string): Promise<void>
  get(key: string): Promise<unknown>
  getAll(): Promise<unknown[]>
  getAllKeys(): Promise<unknown[]>
  clear(): Promise<void>
}

type AnyTransaction = { objectStore(name: never): unknown }

function loose(tx: AnyTransaction, name: string): LooseStore {
  return tx.objectStore(name as never) as LooseStore
}

// ---------------------------------------------------------------------------
// Clocks

/** Highest clock this device has issued or seen - new edits always go above
 * it, even if this device's wall clock runs behind another device's, so a
 * fresh local edit can never lose to something it has already seen. */
let lastStamp = 0
/** Highest clock among this device's own edits - compared against
 * SyncState.syncedUpTo to know whether anything still needs uploading. */
let localMax = 0
const listeners = new Set<() => void>()

/** Writes started but not yet committed. Stores update the screen before
 * their write lands; anything that reloads stores from disk (a sync merge)
 * waits for this to reach zero first, or it could briefly undo an edit the
 * user can already see. */
let pendingWrites = 0
let settleWaiters: Array<() => void> = []

function beginWrite(): () => void {
  pendingWrites++
  return () => {
    pendingWrites--
    if (pendingWrites === 0) {
      const waiters = settleWaiters
      settleWaiters = []
      for (const resolve of waiters) resolve()
    }
  }
}

/** Resolves once no write is in flight. */
export function writesSettled(): Promise<void> {
  return pendingWrites === 0 ? Promise.resolve() : new Promise((resolve) => settleWaiters.push(resolve))
}

function nextStamp(): number {
  const now = Date.now()
  lastStamp = now > lastStamp ? now : lastStamp + 1
  return lastStamp
}

function noteLocalWrite(stamp: number): void {
  if (stamp > localMax) localMax = stamp
  for (const listener of listeners) listener()
}

/** Subscribes to "this device just changed user data" - the sync engine's
 * cue to upload. Returns an unsubscribe function. */
export function onLocalChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getLocalMax(): number {
  return localMax
}

/** Highest clock this tab has issued or seen. */
export function getLastStamp(): number {
  return lastStamp
}

/** Another tab wrote with this clock: never issue one at or below it. */
export function observeStamp(stamp: number): void {
  if (stamp > lastStamp) lastStamp = stamp
}

function isRecordTable(name: string): name is RecordTable {
  return (RECORD_TABLES as readonly string[]).includes(name)
}

function isMetaKey(name: string): name is MetaKey {
  return (META_KEYS as readonly string[]).includes(name)
}

async function putRecords<T extends RecordTable>(table: T, values: RecordValue<T>[]): Promise<void> {
  if (values.length === 0) return
  const done = beginWrite()
  try {
    await putRecordsNow(table, values)
  } finally {
    done()
  }
}

async function putRecordsNow<T extends RecordTable>(table: T, values: RecordValue<T>[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction([table, 'syncClock'], 'readwrite')
  const store = loose(tx, table)
  const clocks = tx.objectStore('syncClock')
  const stamp = nextStamp()
  for (const value of values) {
    void store.put(value)
    void clocks.put({ table, id: value.id, updatedAt: stamp }, clockKey(table, value.id))
  }
  await tx.done
  noteLocalWrite(stamp)
}

async function deleteRecords(table: RecordTable, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const done = beginWrite()
  try {
    await deleteRecordsNow(table, ids)
  } finally {
    done()
  }
}

async function deleteRecordsNow(table: RecordTable, ids: string[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction([table, 'syncClock'], 'readwrite')
  const store = loose(tx, table)
  const clocks = tx.objectStore('syncClock')
  const stamp = nextStamp()
  for (const id of ids) {
    void store.delete(id)
    void clocks.put({ table, id, updatedAt: stamp, deleted: true }, clockKey(table, id))
  }
  await tx.done
  noteLocalWrite(stamp)
}


/** `initial` writes a default that must never beat real data from another
 * device (clock 0) and doesn't count as an edit worth uploading. */
async function putMeta(key: MetaKey, value: MetaValue, options?: { initial?: boolean }): Promise<void> {
  const done = beginWrite()
  try {
    await putMetaNow(key, value, options)
  } finally {
    done()
  }
}

async function putMetaNow(key: MetaKey, value: MetaValue, options?: { initial?: boolean }): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['meta', 'syncClock'], 'readwrite')
  const stamp = options?.initial ? 0 : nextStamp()
  void tx.objectStore('meta').put(value, key)
  void tx.objectStore('syncClock').put({ table: 'meta', id: key, updatedAt: stamp }, clockKey('meta', key))
  await tx.done
  if (!options?.initial) noteLocalWrite(stamp)
}

/** Which media ids a record points at - so a snapshot only carries the
 * TMDB metadata the user's data actually needs. */
function collectMediaRefs(table: SyncTable, value: unknown, into: Set<string>): void {
  const record = value as Record<string, unknown>
  if (table === 'lists' && Array.isArray(record.itemIds)) {
    for (const id of record.itemIds) if (typeof id === 'string') into.add(id)
  } else if (table === 'episodeProgress' && typeof record.showId === 'string') {
    into.add(record.showId)
  } else if (table === 'meta' && Array.isArray(record.favoriteMediaIds)) {
    for (const id of record.favoriteMediaIds) if (typeof id === 'string') into.add(id)
  } else if (typeof record.mediaId === 'string') {
    into.add(record.mediaId)
  }
}

const ALL_DATA_STORES = [...RECORD_TABLES, 'meta', 'syncClock', 'mediaCache'] as const

export const storage = {
  /** Reads every clock once at boot to restore lastStamp/localMax. Must run
   * before the first write of the session. */
  async initClocks(): Promise<void> {
    const clocks = await (await getDB()).getAll('syncClock')
    for (const clock of clocks) {
      if (clock.updatedAt > lastStamp) lastStamp = clock.updatedAt
      if (!clock.remote && clock.updatedAt > localMax) localMax = clock.updatedAt
    }
  },

  async getAllLibraryEntries(): Promise<LibraryEntry[]> {
    return (await getDB()).getAll('libraryEntries')
  },
  async putLibraryEntry(entry: LibraryEntry): Promise<void> {
    await putRecords('libraryEntries', [entry])
  },
  async putLibraryEntries(entries: LibraryEntry[]): Promise<void> {
    await putRecords('libraryEntries', entries)
  },
  async deleteLibraryEntry(id: string): Promise<void> {
    await deleteRecords('libraryEntries', [id])
  },

  async getAllWatchRecords(): Promise<WatchRecord[]> {
    return (await getDB()).getAll('watchRecords')
  },
  async putWatchRecord(record: WatchRecord): Promise<void> {
    await putRecords('watchRecords', [record])
  },
  async deleteWatchRecord(id: string): Promise<void> {
    await deleteRecords('watchRecords', [id])
  },
  async deleteWatchRecordsForMedia(mediaId: string): Promise<void> {
    const done = beginWrite()
    try {
      await deleteRecords('watchRecords', await (await getDB()).getAllKeysFromIndex('watchRecords', 'by-mediaId', mediaId))
    } finally {
      done()
    }
  },

  async getAllEpisodeProgress(): Promise<EpisodeProgress[]> {
    return (await getDB()).getAll('episodeProgress')
  },
  async putEpisodeProgress(progress: EpisodeProgress): Promise<void> {
    await putRecords('episodeProgress', [progress])
  },
  async putEpisodeProgressBatch(items: EpisodeProgress[]): Promise<void> {
    await putRecords('episodeProgress', items)
  },
  async deleteEpisodeProgressForShow(showId: string): Promise<void> {
    const done = beginWrite()
    try {
      await deleteRecords('episodeProgress', await (await getDB()).getAllKeysFromIndex('episodeProgress', 'by-showId', showId))
    } finally {
      done()
    }
  },

  async getAllRatings(): Promise<Rating[]> {
    return (await getDB()).getAll('ratings')
  },
  async putRating(rating: Rating): Promise<void> {
    await putRecords('ratings', [rating])
  },
  async deleteRating(id: string): Promise<void> {
    await deleteRecords('ratings', [id])
  },

  async getAllReviews(): Promise<Review[]> {
    return (await getDB()).getAll('reviews')
  },
  async putReview(review: Review): Promise<void> {
    await putRecords('reviews', [review])
  },
  async deleteReview(id: string): Promise<void> {
    await deleteRecords('reviews', [id])
  },

  async getAllFavoritePeople(): Promise<FavoritePerson[]> {
    return (await getDB()).getAll('favoritePeople')
  },
  async putFavoritePerson(favorite: FavoritePerson): Promise<void> {
    await putRecords('favoritePeople', [favorite])
  },
  async deleteFavoritePerson(id: string): Promise<void> {
    await deleteRecords('favoritePeople', [id])
  },

  async getAllLists(): Promise<CustomList[]> {
    return (await getDB()).getAll('lists')
  },
  async putList(list: CustomList): Promise<void> {
    await putRecords('lists', [list])
  },
  async deleteList(id: string): Promise<void> {
    await deleteRecords('lists', [id])
  },

  async getAllMediaCache(): Promise<MediaSummary[]> {
    return (await getDB()).getAll('mediaCache')
  },
  async cacheMedia(items: MediaSummary[]): Promise<void> {
    if (items.length === 0) return
    const db = await getDB()
    const tx = db.transaction('mediaCache', 'readwrite')
    await Promise.all(items.map((item) => tx.store.put(item)))
    await tx.done
  },

  async getProfile(): Promise<UserProfile | undefined> {
    return (await getDB()).get('meta', 'profile') as Promise<UserProfile | undefined>
  },
  async putProfile(profile: UserProfile, options?: { initial?: boolean }): Promise<void> {
    await putMeta('profile', profile, options)
  },

  async getSettings(): Promise<UserSettings | undefined> {
    return (await getDB()).get('meta', 'settings') as Promise<UserSettings | undefined>
  },
  async putSettings(settings: UserSettings, options?: { initial?: boolean }): Promise<void> {
    await putMeta('settings', settings, options)
  },

  async getApiConfig(): Promise<ApiConfig | undefined> {
    return (await getDB()).get('meta', 'apiConfig') as Promise<ApiConfig | undefined>
  },
  async putApiConfig(config: ApiConfig): Promise<void> {
    await putMeta('apiConfig', config)
  },

  async getSyncState(): Promise<SyncState | undefined> {
    return (await getDB()).get('meta', 'sync') as Promise<SyncState | undefined>
  },
  async putSyncState(state: SyncState): Promise<void> {
    await (await getDB()).put('meta', state, 'sync')
  },

  /** Empties every table on this device, sync bookkeeping included - as if
   * the app had never been opened here. Used by sign-out and when a
   * different account signs in; the account's copy on Drive is untouched. */
  async wipeLocal(): Promise<void> {
    const db = await getDB()
    const tx = db.transaction([...ALL_DATA_STORES], 'readwrite')
    await Promise.all(ALL_DATA_STORES.map((name) => loose(tx, name).clear()))
    await tx.done
    localMax = 0
  },

  /**
   * Serialises everything that syncs into one snapshot. `builtUpTo` is the
   * local clock high-water mark as of just before reading - an edit that
   * lands mid-read is either included (harmless: uploaded twice) or stamped
   * above it (so the device stays dirty and uploads again), never lost.
   */
  async buildSnapshot(epoch: string): Promise<{ snapshot: SyncSnapshot; builtUpTo: number }> {
    const builtUpTo = localMax
    const db = await getDB()
    const tx = db.transaction([...ALL_DATA_STORES], 'readonly')
    const clocks = await tx.objectStore('syncClock').getAll()
    const clockById = new Map(clocks.map((c) => [clockKey(c.table, c.id), c]))
    const tables: Partial<Record<SyncTable, SnapshotRecord[]>> = {}
    const mediaIds = new Set<string>()

    for (const table of RECORD_TABLES) {
      const values = (await loose(tx, table).getAll()) as Array<{ id: string }>
      tables[table] = values.map((value) => {
        collectMediaRefs(table, value, mediaIds)
        return { i: value.id, t: clockById.get(clockKey(table, value.id))?.updatedAt ?? 0, v: value }
      })
    }
    for (const clock of clocks) {
      if (clock.deleted && isRecordTable(clock.table)) tables[clock.table]!.push({ i: clock.id, t: clock.updatedAt, d: 1 })
    }
    const meta: SnapshotRecord[] = []
    for (const key of META_KEYS) {
      const value = await tx.objectStore('meta').get(key)
      if (!value) continue
      collectMediaRefs('meta', value, mediaIds)
      meta.push({ i: key, t: clockById.get(clockKey('meta', key))?.updatedAt ?? 0, v: value })
    }
    tables.meta = meta

    const media: MediaSummary[] = []
    for (const id of mediaIds) {
      const item = await tx.objectStore('mediaCache').get(id)
      if (item) media.push(item)
    }
    await tx.done

    return {
      snapshot: { app: 'movie-tracker', schema: SNAPSHOT_SCHEMA, epoch, writtenAt: Date.now(), tables, media },
      builtUpTo,
    }
  },

  /**
   * Merges another device's snapshot into this one, record by record: the
   * higher clock wins; on an exact tie the incoming copy wins if it differs,
   * so every device converges on the same value. `replaceLocal` first drops
   * everything local (the account's data was deleted elsewhere).
   *
   * Returns whether anything local changed (stores need rehydrating) and
   * whether this device holds anything newer than the snapshot (it should
   * upload the merged result).
   */
  async applyRemoteSnapshot(
    snapshot: SyncSnapshot,
    options?: { replaceLocal?: boolean },
  ): Promise<{ changed: boolean; localAhead: boolean }> {
    const db = await getDB()
    const tx = db.transaction([...ALL_DATA_STORES], 'readwrite')
    const clockStore = tx.objectStore('syncClock')

    if (options?.replaceLocal) {
      await Promise.all([...RECORD_TABLES, 'syncClock'].map((name) => loose(tx, name).clear()))
      await Promise.all(META_KEYS.map((key) => tx.objectStore('meta').delete(key)))
      localMax = 0
    }

    const clocks = await clockStore.getAll()
    const localClocks = new Map<string, SyncClock>(clocks.map((c) => [clockKey(c.table, c.id), c]))
    const seen = new Set<string>()
    let changed = Boolean(options?.replaceLocal)
    let localAhead = false
    let highestRemote = 0

    for (const [table, records] of Object.entries(snapshot.tables)) {
      const isMeta = table === 'meta'
      // Unknown tables come from a newer app version - leave them alone.
      if (!isMeta && !isRecordTable(table)) continue
      if (!Array.isArray(records)) continue
      const store = loose(tx, table)
      const current = new Map<string, unknown>()
      if (isMeta) {
        for (const key of META_KEYS) current.set(key, await store.get(key))
      } else {
        for (const value of (await store.getAll()) as Array<{ id: string }>) current.set(value.id, value)
      }

      for (const record of records) {
        if (!record || typeof record.i !== 'string' || typeof record.t !== 'number') continue
        if (!record.d && (typeof record.v !== 'object' || record.v === null)) continue
        // A record store's key comes from the value's own id - one that
        // disagrees with the snapshot's would land under the wrong key.
        if (isMeta ? !isMetaKey(record.i) : !record.d && (record.v as { id?: unknown }).id !== record.i) continue
        const key = clockKey(table as SyncTable, record.i)
        seen.add(key)
        if (record.t > highestRemote) highestRemote = record.t

        const local = localClocks.get(key)
        let apply = !local || record.t > local.updatedAt
        if (!apply && local && record.t === local.updatedAt) {
          apply = Boolean(record.d) !== Boolean(local.deleted) || (!record.d && JSON.stringify(current.get(record.i)) !== JSON.stringify(record.v))
        }
        if (!apply) {
          if (local && local.updatedAt > record.t) localAhead = true
          continue
        }
        if (record.d) void store.delete(record.i)
        else void (isMeta ? store.put(record.v, record.i) : store.put(record.v))
        const clock: SyncClock = { table: table as SyncTable, id: record.i, updatedAt: record.t, remote: true }
        if (record.d) clock.deleted = true
        void clockStore.put(clock, key)
        changed = true
      }
    }

    for (const [key, clock] of localClocks) {
      if (!seen.has(key) && clock.updatedAt > 0) localAhead = true
    }

    if (Array.isArray(snapshot.media)) {
      const mediaStore = tx.objectStore('mediaCache')
      const cached = new Set((await mediaStore.getAllKeys()) as string[])
      for (const item of snapshot.media) {
        if (item && typeof item.id === 'string' && !cached.has(item.id)) {
          void mediaStore.put(item)
          changed = true
        }
      }
    }

    await tx.done
    if (highestRemote > lastStamp) lastStamp = highestRemote
    return { changed, localAhead }
  },

  /**
   * Import, "replace" flavour: the file becomes the whole library. Existing
   * records the file doesn't have are deleted (tombstoned, so the deletion
   * reaches other devices too); everything in it is stamped as a fresh edit.
   */
  async importReplace(data: ImportData): Promise<void> {
    const db = await getDB()
    const tx = db.transaction([...ALL_DATA_STORES], 'readwrite')
    const clocks = tx.objectStore('syncClock')
    const stamp = nextStamp()
    for (const table of RECORD_TABLES) {
      const store = loose(tx, table)
      const incoming = data[table] as Array<{ id: string }>
      const keep = new Set(incoming.map((value) => value.id))
      for (const id of (await store.getAllKeys()) as string[]) {
        if (keep.has(id)) continue
        void store.delete(id)
        void clocks.put({ table, id, updatedAt: stamp, deleted: true }, clockKey(table, id))
      }
      for (const value of incoming) {
        void store.put(value)
        void clocks.put({ table, id: value.id, updatedAt: stamp }, clockKey(table, value.id))
      }
    }
    const meta: Array<[MetaKey, MetaValue | undefined]> = [
      ['profile', data.profile],
      ['settings', data.settings],
      ['apiConfig', data.apiConfig],
    ]
    for (const [key, value] of meta) {
      if (!value) continue
      void tx.objectStore('meta').put(value, key)
      void clocks.put({ table: 'meta', id: key, updatedAt: stamp }, clockKey('meta', key))
    }
    for (const item of data.mediaCache) void tx.objectStore('mediaCache').put(item)
    await tx.done
    noteLocalWrite(stamp)
  },

  /**
   * Import, "merge" flavour: brings in whatever the file has that this
   * device doesn't - a record missing here, or one the file holds a newer
   * version of (judged by the records' own timestamps). Nothing local is
   * deleted, and nothing newer here is overwritten by an older file.
   */
  async importMerge(data: ImportData): Promise<void> {
    const db = await getDB()
    const tx = db.transaction([...ALL_DATA_STORES], 'readwrite')
    const clockStore = tx.objectStore('syncClock')
    const clocks = new Map((await clockStore.getAll()).map((c) => [clockKey(c.table, c.id), c]))
    const stamp = nextStamp()
    let wrote = false
    for (const table of RECORD_TABLES) {
      const store = loose(tx, table)
      for (const value of data[table] as Array<{ id: string }>) {
        const local = clocks.get(clockKey(table, value.id))
        if (local && !local.deleted && local.updatedAt >= inferClock(table, value)) continue
        void store.put(value)
        void clockStore.put({ table, id: value.id, updatedAt: stamp }, clockKey(table, value.id))
        wrote = true
      }
    }
    // A merge never erases an existing personal key with an absent one -
    // only bring the file's key in when this device has none.
    const localConfig = (await tx.objectStore('meta').get('apiConfig')) as ApiConfig | undefined
    if (data.apiConfig?.tmdbApiKey && !localConfig?.tmdbApiKey) {
      void tx.objectStore('meta').put(data.apiConfig, 'apiConfig')
      void clockStore.put({ table: 'meta', id: 'apiConfig', updatedAt: stamp }, clockKey('meta', 'apiConfig'))
      wrote = true
    }
    for (const item of data.mediaCache) void tx.objectStore('mediaCache').put(item)
    await tx.done
    if (wrote) noteLocalWrite(stamp)
  },
}

export interface ImportData {
  libraryEntries: LibraryEntry[]
  watchRecords: WatchRecord[]
  episodeProgress: EpisodeProgress[]
  ratings: Rating[]
  reviews: Review[]
  favoritePeople: FavoritePerson[]
  lists: CustomList[]
  mediaCache: MediaSummary[]
  profile?: UserProfile
  settings?: UserSettings
  apiConfig?: ApiConfig
}

/** Turns the previous design's Drive backup (an export bundle) into a
 * snapshot, dating each record by its own timestamps so anything edited
 * since on a device still wins. */
export function snapshotFromLegacyBundle(data: ImportData, epoch: string): SyncSnapshot {
  const tables: Partial<Record<SyncTable, SnapshotRecord[]>> = {}
  for (const table of RECORD_TABLES) {
    tables[table] = (data[table] as Array<{ id: string }>).map((value) => ({ i: value.id, t: inferClock(table, value), v: value }))
  }
  const meta: SnapshotRecord[] = []
  if (data.profile) meta.push({ i: 'profile', t: 1, v: data.profile })
  if (data.settings) meta.push({ i: 'settings', t: 1, v: data.settings })
  if (data.apiConfig?.tmdbApiKey) meta.push({ i: 'apiConfig', t: 1, v: data.apiConfig })
  tables.meta = meta
  return { app: 'movie-tracker', schema: SNAPSHOT_SCHEMA, epoch, writtenAt: Date.now(), tables, media: data.mediaCache }
}
