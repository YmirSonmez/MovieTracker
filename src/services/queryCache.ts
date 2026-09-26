import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/**
 * A small stale-while-revalidate cache for TMDB (or demo catalog) reads.
 *
 * Anything already seen renders immediately - from memory within a session,
 * from its own IndexedDB database across restarts - and is refreshed in
 * the background once it's older than its `staleAfter`. Concurrent requests
 * for the same key share one network call. A background refresh that fails
 * keeps showing what's there, so previously visited pages keep working
 * offline too.
 *
 * This is catalog metadata, not user data: it lives in a separate database
 * that sync never reads, and losing it only costs a re-fetch.
 */

export interface QueryDef<T> {
  key: string
  fetch: () => Promise<T>
  /** Data older than this is still shown, but refreshed in the background. */
  staleAfter: number
  /** Also keep it on disk across app restarts. */
  persist?: boolean
}

interface Snapshot {
  data: unknown
  error: unknown
  /** 0 = nothing loaded yet. */
  fetchedAt: number
}

interface Entry {
  snapshot: Snapshot
  listeners: Set<() => void>
  inflight?: Promise<unknown>
  diskRead?: Promise<void>
}

const EMPTY: Snapshot = { data: undefined, error: undefined, fetchedAt: 0 }
const MEMORY_LIMIT = 250
const DISK_LIMIT = 200
const DISK_MAX_AGE_MS = 14 * 24 * 60 * 60_000

const entries = new Map<string, Entry>()

function entryFor(key: string): Entry {
  let entry = entries.get(key)
  if (!entry) {
    entry = { snapshot: EMPTY, listeners: new Set() }
    entries.set(key, entry)
    if (entries.size > MEMORY_LIMIT) evictFromMemory()
  }
  return entry
}

/** Drops the oldest entries nobody is looking at. */
function evictFromMemory(): void {
  const idle = [...entries].filter(([, e]) => e.listeners.size === 0 && !e.inflight).sort(([, a], [, b]) => a.snapshot.fetchedAt - b.snapshot.fetchedAt)
  for (const [key] of idle.slice(0, entries.size - MEMORY_LIMIT)) entries.delete(key)
}

function update(key: string, patch: Partial<Snapshot>): void {
  const entry = entryFor(key)
  entry.snapshot = { ...entry.snapshot, ...patch }
  for (const listener of entry.listeners) listener()
}

function isFresh(snapshot: Snapshot, staleAfter: number): boolean {
  return snapshot.fetchedAt > 0 && Date.now() - snapshot.fetchedAt < staleAfter
}

// ---------------------------------------------------------------------------
// Disk

interface CacheDB extends DBSchema {
  queries: { key: string; value: { key: string; data: unknown; fetchedAt: number }; indexes: { 'by-fetchedAt': number } }
}

let dbPromise: Promise<IDBPDatabase<CacheDB> | null> | null = null
let writesSincePrune = 0
/** Which keys are on disk, loaded once when the database opens - lets a
 * miss (a title never seen before) skip the disk read and go straight to
 * the network. */
let diskKeys: Promise<Set<string>> | null = null

function cacheDB(): Promise<IDBPDatabase<CacheDB> | null> {
  dbPromise ??= openDB<CacheDB>('movie-tracker-cache', 1, {
    upgrade(db) {
      db.createObjectStore('queries', { keyPath: 'key' }).createIndex('by-fetchedAt', 'fetchedAt')
    },
    blocking() {
      void dbPromise?.then((db) => db?.close())
      dbPromise = null
    },
  }).catch(() => null) // storage unavailable - memory-only is fine
  return dbPromise
}

/** Opens the cache database ahead of the first read, so a page's first
 * lookup (usually a miss) doesn't pay for opening it before the network
 * request can even start. */
export function warmQueryCache(): void {
  void knownDiskKeys()
}

function knownDiskKeys(): Promise<Set<string>> {
  diskKeys ??= cacheDB()
    .then((db) => (db ? db.getAllKeys('queries') : []))
    .then((keys) => new Set(keys))
    .catch(() => new Set<string>())
  return diskKeys
}

async function readDisk(key: string): Promise<{ data: unknown; fetchedAt: number } | undefined> {
  try {
    if (!(await knownDiskKeys()).has(key)) return undefined
    const db = await cacheDB()
    return (await db?.get('queries', key)) ?? undefined
  } catch {
    return undefined
  }
}

async function writeDisk(key: string, data: unknown, fetchedAt: number): Promise<void> {
  try {
    const db = await cacheDB()
    if (!db) return
    await db.put('queries', { key, data, fetchedAt })
    void knownDiskKeys().then((keys) => keys.add(key))
    if (++writesSincePrune >= 20) {
      writesSincePrune = 0
      await pruneDisk(db)
    }
  } catch {
    // Quota or private mode - the in-memory copy still serves this session.
  }
}

/** Keeps the newest DISK_LIMIT entries and nothing older than two weeks. */
async function pruneDisk(db: IDBPDatabase<CacheDB>): Promise<void> {
  const keys = await db.getAllKeysFromIndex('queries', 'by-fetchedAt')
  const tooOld = await db.getAllKeysFromIndex('queries', 'by-fetchedAt', IDBKeyRange.upperBound(Date.now() - DISK_MAX_AGE_MS))
  const drop = new Set([...keys.slice(0, Math.max(0, keys.length - DISK_LIMIT)), ...tooOld])
  if (drop.size === 0) return
  const tx = db.transaction('queries', 'readwrite')
  for (const key of drop) void tx.store.delete(key)
  await tx.done
  const known = await knownDiskKeys()
  for (const key of drop) known.delete(key)
}

function loadFromDisk(def: QueryDef<unknown>): Promise<void> {
  const entry = entryFor(def.key)
  if (!def.persist) return Promise.resolve()
  entry.diskRead ??= readDisk(def.key).then((hit) => {
    if (hit && hit.fetchedAt > entryFor(def.key).snapshot.fetchedAt) update(def.key, { data: hit.data, fetchedAt: hit.fetchedAt })
  })
  return entry.diskRead
}

// ---------------------------------------------------------------------------
// Core

function revalidate<T>(def: QueryDef<T>): Promise<T> {
  const entry = entryFor(def.key)
  if (entry.inflight) return entry.inflight as Promise<T>
  // A retry after a failure goes back to "loading" rather than keeping the
  // error on screen while it runs.
  if (entry.snapshot.fetchedAt === 0 && entry.snapshot.error) update(def.key, { error: undefined })
  const request = def
    .fetch()
    .then(
      (data) => {
        const fetchedAt = Date.now()
        update(def.key, { data, error: undefined, fetchedAt })
        if (def.persist) void writeDisk(def.key, data, fetchedAt)
        return data
      },
      (error: unknown) => {
        update(def.key, { error })
        throw error
      },
    )
    .finally(() => {
      entryFor(def.key).inflight = undefined
    })
  entry.inflight = request
  return request
}

/** Memory, then disk, then network - and a background refresh if stale. */
async function ensure<T>(def: QueryDef<T>): Promise<void> {
  const entry = entryFor(def.key)
  if (entry.snapshot.fetchedAt === 0) await loadFromDisk(def as QueryDef<unknown>)
  if (!isFresh(entryFor(def.key).snapshot, def.staleAfter)) await revalidate(def).catch(() => {})
}

/**
 * Imperative read for code outside a component's render (paging, the
 * "continue watching" list): resolves with cached data straight away if
 * there is any - refreshing it in the background when stale - otherwise
 * waits for the network.
 */
export async function fetchQuery<T>(def: QueryDef<T>): Promise<T> {
  let snapshot = entryFor(def.key).snapshot
  if (snapshot.fetchedAt === 0) {
    await loadFromDisk(def as QueryDef<unknown>)
    snapshot = entryFor(def.key).snapshot
  }
  if (snapshot.fetchedAt === 0) return revalidate(def)
  if (!isFresh(snapshot, def.staleAfter)) void revalidate(def).catch(() => {})
  return snapshot.data as T
}

/** Warms the cache for something the user is probably about to open. */
export function prefetchQuery<T>(def: QueryDef<T>): void {
  void ensure(def)
}

export interface QueryResult<T> {
  data: T | undefined
  /** Only set when there's nothing to show at all. */
  error: unknown
  isLoading: boolean
  refetch: () => void
}

export function useQuery<T>(def: QueryDef<T> | null): QueryResult<T> {
  const key = def?.key ?? null
  const defRef = useRef(def)
  defRef.current = def

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!key) return () => {}
      const entry = entryFor(key)
      entry.listeners.add(onChange)
      return () => {
        entry.listeners.delete(onChange)
      }
    },
    [key],
  )
  const snapshot = useSyncExternalStore(subscribe, () => (key ? entryFor(key).snapshot : EMPTY))

  useEffect(() => {
    if (defRef.current) void ensure(defRef.current)
  }, [key])

  const refetch = useCallback(() => {
    if (defRef.current) void revalidate(defRef.current).catch(() => {})
  }, [])

  const hasData = snapshot.fetchedAt > 0
  return {
    data: snapshot.data as T | undefined,
    error: hasData ? undefined : snapshot.error,
    isLoading: Boolean(key) && !hasData && !snapshot.error,
    refetch,
  }
}
