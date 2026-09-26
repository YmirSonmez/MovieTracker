import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction, type StoreNames } from 'idb'
import { STORAGE_DB_NAME, STORAGE_DB_VERSION } from '@/utils/constants'
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

/** Tables that hold user data and sync between devices, one record per id.
 * `meta` holds the three singletons (profile/settings/apiConfig) under
 * those ids. mediaCache is deliberately not here: it's a local cache of
 * TMDB metadata, not user data. */
export const RECORD_TABLES = [
  'libraryEntries',
  'watchRecords',
  'episodeProgress',
  'ratings',
  'reviews',
  'favoritePeople',
  'lists',
] as const
export type RecordTable = (typeof RECORD_TABLES)[number]
export type SyncTable = RecordTable | 'meta'
export const META_KEYS = ['profile', 'settings', 'apiConfig'] as const
export type MetaKey = (typeof META_KEYS)[number]

/**
 * When a record last changed and whether that change is a deletion. One
 * per synced record, written in the same transaction as the record itself,
 * so a sync can merge two devices record-by-record (newer wins) instead of
 * whole-file. `remote` marks a clock that arrived from another device
 * rather than a local edit - only local edits make this device "dirty".
 */
export interface SyncClock {
  table: SyncTable
  id: string
  updatedAt: number
  deleted?: true
  remote?: true
}

/**
 * This device's relationship with the account's copy on Drive. Lives in
 * IndexedDB next to the data it describes (not localStorage) so the two
 * can never be cleared independently - a device whose data was wiped also
 * forgets it ever synced, and simply pulls everything again.
 */
export interface SyncState {
  /** The Google account this device's data belongs to. */
  account: string
  fileId?: string
  /** Drive's `version` of the file as of this device's last read/write -
   * a cheap, content-free way to tell whether anything changed since. */
  remoteVersion?: string
  /** Identifies one "lifetime" of the account's data. "Delete all my data"
   * starts a new one, which tells every other device to drop its copy
   * instead of re-uploading it. */
  epoch?: string
  /** Every local edit stamped at or below this is already on Drive. */
  syncedUpTo: number
  lastSyncedAt?: number
  /** Whether the previous design's `movie-tracker-backup.json` has been
   * looked for (and, if found, merged in) for this account. */
  legacyChecked?: boolean
}

export interface MovieTrackerDB extends DBSchema {
  libraryEntries: {
    key: string
    value: LibraryEntry
    indexes: { 'by-status': string; 'by-mediaType': string }
  }
  watchRecords: {
    key: string
    value: WatchRecord
    indexes: { 'by-mediaId': string }
  }
  episodeProgress: {
    key: string
    value: EpisodeProgress
    indexes: { 'by-showId': string }
  }
  ratings: { key: string; value: Rating }
  reviews: { key: string; value: Review }
  favoritePeople: { key: string; value: FavoritePerson }
  lists: { key: string; value: CustomList }
  mediaCache: { key: string; value: MediaSummary }
  meta: { key: string; value: UserProfile | UserSettings | ApiConfig | SyncState }
  syncClock: { key: string; value: SyncClock }
}

export function clockKey(table: SyncTable, id: string): string {
  return `${table}/${id}`
}

/**
 * Best guess at when a record last changed, from its own timestamps - used
 * for data that predates per-record clocks (a pre-v2 database, the previous
 * design's Drive backup, an imported file). Deriving it from the record
 * itself rather than "now" means two devices that both hold an old copy of
 * the same record agree on its age, so the stale one can't win a merge just
 * because its device happened to upgrade later. Clamped to now so one
 * mistyped future date can't outrank every real edit after it.
 */
export function inferClock(table: RecordTable, value: unknown): number {
  const record = value as Record<string, unknown>
  const candidates: Record<RecordTable, string[]> = {
    libraryEntries: ['updatedAt', 'addedAt'],
    watchRecords: ['watchedAt'],
    episodeProgress: ['watchedAt'],
    ratings: ['updatedAt', 'createdAt'],
    reviews: ['updatedAt', 'createdAt'],
    favoritePeople: ['addedAt'],
    lists: ['updatedAt', 'createdAt'],
  }
  for (const field of candidates[table]) {
    const raw = record[field]
    const parsed = typeof raw === 'string' ? Date.parse(raw) : NaN
    if (Number.isFinite(parsed) && parsed > 0) return Math.min(parsed, Date.now())
  }
  return 1
}

/** Clock for profile/settings/apiConfig found on this device at upgrade -
 * above a fresh device's untouched defaults (0) and the previous design's
 * backup file (1), below any real edit made after this version shipped. */
const MIGRATED_META_CLOCK = 2

type UpgradeTransaction = IDBPTransaction<MovieTrackerDB, StoreNames<MovieTrackerDB>[], 'versionchange'>

async function stampExistingRecords(tx: UpgradeTransaction): Promise<void> {
  const clocks = tx.objectStore('syncClock')
  for (const table of RECORD_TABLES) {
    const values = (await tx.objectStore(table).getAll()) as Array<{ id: string }>
    for (const value of values) {
      void clocks.put({ table, id: value.id, updatedAt: inferClock(table, value) }, clockKey(table, value.id))
    }
  }
  for (const key of META_KEYS) {
    if (await tx.objectStore('meta').getKey(key)) {
      void clocks.put({ table: 'meta', id: key, updatedAt: MIGRATED_META_CLOCK }, clockKey('meta', key))
    }
  }
}

let dbPromise: Promise<IDBPDatabase<MovieTrackerDB>> | null = null

export function getDB(): Promise<IDBPDatabase<MovieTrackerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MovieTrackerDB>(STORAGE_DB_NAME, STORAGE_DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const libraryEntries = db.createObjectStore('libraryEntries', { keyPath: 'id' })
          libraryEntries.createIndex('by-status', 'status')
          libraryEntries.createIndex('by-mediaType', 'mediaType')

          const watchRecords = db.createObjectStore('watchRecords', { keyPath: 'id' })
          watchRecords.createIndex('by-mediaId', 'mediaId')

          const episodeProgress = db.createObjectStore('episodeProgress', { keyPath: 'id' })
          episodeProgress.createIndex('by-showId', 'showId')

          db.createObjectStore('ratings', { keyPath: 'id' })
          db.createObjectStore('reviews', { keyPath: 'id' })
          db.createObjectStore('favoritePeople', { keyPath: 'id' })
          db.createObjectStore('lists', { keyPath: 'id' })
          db.createObjectStore('mediaCache', { keyPath: 'id' })
          db.createObjectStore('meta')
        }
        if (oldVersion < 2) {
          db.createObjectStore('syncClock')
          // Pointer from the previous Drive sync design - meaningless now.
          void tx.objectStore('meta').delete('cloudSync')
          // Runs inside the upgrade transaction, so it happens exactly once
          // and nothing can read or write the database until it's done.
          if (oldVersion >= 1) void stampExistingRecords(tx)
        }
      },
      // A newer version of the app opened in another tab and needs to
      // upgrade the schema: step aside (and reload into that version)
      // instead of blocking it and writing to a schema that's going away.
      blocking() {
        void dbPromise?.then((db) => db.close())
        dbPromise = null
        window.location.reload()
      },
    })
  }
  return dbPromise
}
