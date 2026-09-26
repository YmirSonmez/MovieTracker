import { create } from 'zustand'
import { storage } from '@/services/storage/repository'
import { generateId, episodeProgressId } from '@/utils/id'
import { getShowCompletion } from '@/utils/progress'
import { persist } from './persist'
import type { MediaType, Season } from '@/types/media'
import type { EpisodeProgress, LibraryEntry, WatchlistPriority, WatchRecord, WatchStatus } from '@/types/watch'

interface LibraryState {
  hydrated: boolean
  entries: Record<string, LibraryEntry>
  watchRecords: WatchRecord[]
  episodeProgress: EpisodeProgress[]

  hydrate: () => Promise<void>

  getEntry: (mediaId: string) => LibraryEntry | undefined
  markWatched: (mediaId: string, mediaType: MediaType, watchedAt?: string, runtimeMinutes?: number) => Promise<void>
  markUnwatched: (mediaId: string) => Promise<void>
  rewatch: (mediaId: string, mediaType: MediaType, watchedAt?: string, runtimeMinutes?: number) => Promise<void>
  setWatching: (mediaId: string, mediaType: MediaType) => Promise<void>
  setDropped: (mediaId: string, mediaType: MediaType) => Promise<void>
  addToWatchlist: (mediaId: string, mediaType: MediaType, priority?: WatchlistPriority, note?: string) => Promise<void>
  removeFromWatchlist: (mediaId: string) => Promise<void>
  reorderWatchlist: (orderedMediaIds: string[]) => Promise<void>
  toggleFavorite: (mediaId: string, mediaType: MediaType) => Promise<void>
  removeFromLibrary: (mediaId: string) => Promise<void>

  isEpisodeWatched: (showId: string, seasonNumber: number, episodeNumber: number) => boolean
  markEpisodeWatched: (showId: string, seasonNumber: number, episodeNumber: number, watchedAt?: string, runtimeMinutes?: number) => Promise<void>
  markEpisodeUnwatched: (showId: string, seasonNumber: number, episodeNumber: number) => Promise<void>
  markSeasonWatched: (showId: string, season: Season) => Promise<void>
  markAllEpisodesWatched: (showId: string, seasons: Season[]) => Promise<void>
  syncShowStatusFromProgress: (showId: string, seasons: Season[]) => Promise<void>
}

function now(): string {
  return new Date().toISOString()
}

function withStatus(existing: LibraryEntry | undefined, mediaId: string, mediaType: MediaType, status: WatchStatus, timestamp: string): LibraryEntry {
  return existing
    ? { ...existing, status, updatedAt: timestamp }
    : { id: mediaId, mediaId, mediaType, status, isFavorite: false, addedAt: timestamp, updatedAt: timestamp }
}

/**
 * Every action updates the in-memory state first - synchronously, before
 * its first await - so the screen reacts on the same frame as the tap, and
 * only then writes to IndexedDB (see persist()).
 */
export const useLibraryStore = create<LibraryState>((set, get) => {
  const reload = () => get().hydrate()

  function putEntry(entry: LibraryEntry): void {
    set((state) => ({ entries: { ...state.entries, [entry.mediaId]: entry } }))
  }

  function dropEntry(mediaId: string): void {
    set((state) => {
      const entries = { ...state.entries }
      delete entries[mediaId]
      return { entries }
    })
  }

  function putProgress(items: EpisodeProgress[]): void {
    const ids = new Set(items.map((i) => i.id))
    set((state) => ({ episodeProgress: [...state.episodeProgress.filter((p) => !ids.has(p.id)), ...items] }))
  }

  return {
    hydrated: false,
    entries: {},
    watchRecords: [],
    episodeProgress: [],

    async hydrate() {
      const [entries, watchRecords, episodeProgress] = await Promise.all([
        storage.getAllLibraryEntries(),
        storage.getAllWatchRecords(),
        storage.getAllEpisodeProgress(),
      ])
      set({
        entries: Object.fromEntries(entries.map((e) => [e.mediaId, e])),
        watchRecords,
        episodeProgress,
        hydrated: true,
      })
    },

    getEntry(mediaId) {
      return get().entries[mediaId]
    },

    async markWatched(mediaId, mediaType, watchedAt, runtimeMinutes) {
      const timestamp = now()
      const entry = withStatus(get().entries[mediaId], mediaId, mediaType, 'completed', timestamp)
      const record: WatchRecord | null = get().watchRecords.some((r) => r.mediaId === mediaId)
        ? null
        : { id: generateId(), mediaId, mediaType, watchedAt: watchedAt ?? timestamp, isRewatch: false, runtimeMinutes }
      set((state) => ({
        entries: { ...state.entries, [mediaId]: entry },
        watchRecords: record ? [...state.watchRecords, record] : state.watchRecords,
      }))
      await persist(Promise.all([storage.putLibraryEntry(entry), record && storage.putWatchRecord(record)]), reload)
    },

    async markUnwatched(mediaId) {
      const existing = get().entries[mediaId]
      if (!existing) return
      const keepsEntry = existing.isFavorite || existing.status === 'planned'
      const updated: LibraryEntry | null = keepsEntry
        ? { ...existing, status: existing.isFavorite ? undefined : 'planned', updatedAt: now() }
        : null
      set((state) => {
        const entries = { ...state.entries }
        if (updated) entries[mediaId] = updated
        else delete entries[mediaId]
        return { entries, watchRecords: state.watchRecords.filter((r) => r.mediaId !== mediaId) }
      })
      await persist(
        Promise.all([
          storage.deleteWatchRecordsForMedia(mediaId),
          updated ? storage.putLibraryEntry(updated) : storage.deleteLibraryEntry(mediaId),
        ]),
        reload,
      )
    },

    async rewatch(mediaId, mediaType, watchedAt, runtimeMinutes) {
      const timestamp = now()
      const entry = withStatus(get().entries[mediaId], mediaId, mediaType, 'completed', timestamp)
      const record: WatchRecord = { id: generateId(), mediaId, mediaType, watchedAt: watchedAt ?? timestamp, isRewatch: true, runtimeMinutes }
      set((state) => ({
        entries: { ...state.entries, [mediaId]: entry },
        watchRecords: [...state.watchRecords, record],
      }))
      await persist(Promise.all([storage.putLibraryEntry(entry), storage.putWatchRecord(record)]), reload)
    },

    async setWatching(mediaId, mediaType) {
      const entry = withStatus(get().entries[mediaId], mediaId, mediaType, 'watching', now())
      putEntry(entry)
      await persist(storage.putLibraryEntry(entry), reload)
    },

    async setDropped(mediaId, mediaType) {
      const entry = withStatus(get().entries[mediaId], mediaId, mediaType, 'dropped', now())
      putEntry(entry)
      await persist(storage.putLibraryEntry(entry), reload)
    },

    async addToWatchlist(mediaId, mediaType, priority, note) {
      const existing = get().entries[mediaId]
      const timestamp = now()
      const maxOrder = Math.max(0, ...Object.values(get().entries).map((e) => e.watchlistOrder ?? 0))
      const entry: LibraryEntry = {
        id: mediaId,
        mediaId,
        mediaType,
        isFavorite: existing?.isFavorite ?? false,
        addedAt: existing?.addedAt ?? timestamp,
        updatedAt: timestamp,
        status: 'planned',
        watchlistPriority: priority ?? existing?.watchlistPriority,
        watchlistNote: note ?? existing?.watchlistNote,
        watchlistOrder: existing?.watchlistOrder ?? maxOrder + 1,
      }
      putEntry(entry)
      await persist(storage.putLibraryEntry(entry), reload)
    },

    async removeFromWatchlist(mediaId) {
      const existing = get().entries[mediaId]
      if (!existing) return
      if (existing.isFavorite) {
        const updated: LibraryEntry = {
          ...existing,
          status: undefined,
          watchlistPriority: undefined,
          watchlistNote: undefined,
          watchlistOrder: undefined,
          updatedAt: now(),
        }
        putEntry(updated)
        await persist(storage.putLibraryEntry(updated), reload)
      } else {
        dropEntry(mediaId)
        await persist(storage.deleteLibraryEntry(mediaId), reload)
      }
    },

    async reorderWatchlist(orderedMediaIds) {
      const timestamp = now()
      const updates: LibraryEntry[] = []
      orderedMediaIds.forEach((mediaId, index) => {
        const existing = get().entries[mediaId]
        if (existing) updates.push({ ...existing, watchlistOrder: index, updatedAt: timestamp })
      })
      set((state) => {
        const entries = { ...state.entries }
        updates.forEach((e) => (entries[e.mediaId] = e))
        return { entries }
      })
      await persist(storage.putLibraryEntries(updates), reload)
    },

    async toggleFavorite(mediaId, mediaType) {
      const existing = get().entries[mediaId]
      const timestamp = now()
      const entry: LibraryEntry = existing
        ? { ...existing, isFavorite: !existing.isFavorite, updatedAt: timestamp }
        : { id: mediaId, mediaId, mediaType, status: undefined, isFavorite: true, addedAt: timestamp, updatedAt: timestamp }
      putEntry(entry)
      await persist(storage.putLibraryEntry(entry), reload)
    },

    async removeFromLibrary(mediaId) {
      set((state) => {
        const entries = { ...state.entries }
        delete entries[mediaId]
        return {
          entries,
          watchRecords: state.watchRecords.filter((r) => r.mediaId !== mediaId),
          episodeProgress: state.episodeProgress.filter((p) => p.showId !== mediaId),
        }
      })
      await persist(
        Promise.all([
          storage.deleteLibraryEntry(mediaId),
          storage.deleteWatchRecordsForMedia(mediaId),
          storage.deleteEpisodeProgressForShow(mediaId),
        ]),
        reload,
      )
    },

    isEpisodeWatched(showId, seasonNumber, episodeNumber) {
      const id = episodeProgressId(showId, seasonNumber, episodeNumber)
      return get().episodeProgress.some((p) => p.id === id && p.watched)
    },

    async markEpisodeWatched(showId, seasonNumber, episodeNumber, watchedAt, runtimeMinutes) {
      const progress: EpisodeProgress = {
        id: episodeProgressId(showId, seasonNumber, episodeNumber),
        showId,
        seasonNumber,
        episodeNumber,
        watched: true,
        watchedAt: watchedAt ?? now(),
        runtimeMinutes,
      }
      putProgress([progress])
      await persist(storage.putEpisodeProgress(progress), reload)
    },

    async markEpisodeUnwatched(showId, seasonNumber, episodeNumber) {
      const id = episodeProgressId(showId, seasonNumber, episodeNumber)
      const progress: EpisodeProgress = { id, showId, seasonNumber, episodeNumber, watched: false, watchedAt: null }
      putProgress([progress])
      await persist(storage.putEpisodeProgress(progress), reload)
    },

    async markSeasonWatched(showId, season) {
      const timestamp = now()
      const items: EpisodeProgress[] = season.episodes.map((ep) => ({
        id: episodeProgressId(showId, ep.seasonNumber, ep.episodeNumber),
        showId,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        watched: true,
        watchedAt: timestamp,
        runtimeMinutes: ep.runtime ?? undefined,
      }))
      putProgress(items)
      await persist(storage.putEpisodeProgressBatch(items), reload)
    },

    async markAllEpisodesWatched(showId, seasons) {
      const timestamp = now()
      const items: EpisodeProgress[] = seasons.flatMap((season) =>
        season.episodes.map((ep) => ({
          id: episodeProgressId(showId, ep.seasonNumber, ep.episodeNumber),
          showId,
          runtimeMinutes: ep.runtime ?? undefined,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          watched: true,
          watchedAt: timestamp,
        })),
      )
      putProgress(items)
      const status = get().syncShowStatusFromProgress(showId, seasons)
      await persist(storage.putEpisodeProgressBatch(items), reload)
      await status
    },

    async syncShowStatusFromProgress(showId, seasons) {
      const completion = getShowCompletion(seasons, get().episodeProgress)
      if (completion.totalCount === 0) return
      if (completion.watchedCount === 0) return
      const status = completion.percent >= 100 ? 'completed' : 'watching'
      const existing = get().entries[showId]
      // Runs on every progress change while a show page is open - writing
      // an unchanged status would still bump its clock and trigger a sync.
      if (existing?.status === status) return
      const entry = withStatus(existing, showId, 'tv', status, now())
      putEntry(entry)
      await persist(storage.putLibraryEntry(entry), reload)
    },
  }
})
