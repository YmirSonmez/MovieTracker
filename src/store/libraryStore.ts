import { create } from 'zustand'
import { storage } from '@/services/storage/repository'
import { generateId, episodeProgressId } from '@/utils/id'
import { getShowCompletion } from '@/utils/progress'
import type { MediaType, Season } from '@/types/media'
import type { EpisodeProgress, LibraryEntry, WatchlistPriority, WatchRecord } from '@/types/watch'

interface LibraryState {
  hydrated: boolean
  entries: Record<string, LibraryEntry>
  watchRecords: WatchRecord[]
  episodeProgress: EpisodeProgress[]

  hydrate: () => Promise<void>

  getEntry: (mediaId: string) => LibraryEntry | undefined
  markWatched: (mediaId: string, mediaType: MediaType, watchedAt?: string) => Promise<void>
  markUnwatched: (mediaId: string) => Promise<void>
  rewatch: (mediaId: string, mediaType: MediaType, watchedAt?: string) => Promise<void>
  setWatching: (mediaId: string, mediaType: MediaType) => Promise<void>
  setDropped: (mediaId: string, mediaType: MediaType) => Promise<void>
  addToWatchlist: (mediaId: string, mediaType: MediaType, priority?: WatchlistPriority, note?: string) => Promise<void>
  removeFromWatchlist: (mediaId: string) => Promise<void>
  reorderWatchlist: (orderedMediaIds: string[]) => Promise<void>
  toggleFavorite: (mediaId: string, mediaType: MediaType) => Promise<void>
  removeFromLibrary: (mediaId: string) => Promise<void>

  isEpisodeWatched: (showId: string, seasonNumber: number, episodeNumber: number) => boolean
  markEpisodeWatched: (showId: string, seasonNumber: number, episodeNumber: number, watchedAt?: string) => Promise<void>
  markEpisodeUnwatched: (showId: string, seasonNumber: number, episodeNumber: number) => Promise<void>
  markSeasonWatched: (showId: string, season: Season) => Promise<void>
  markAllEpisodesWatched: (showId: string, seasons: Season[]) => Promise<void>
  syncShowStatusFromProgress: (showId: string, seasons: Season[]) => Promise<void>
}

function now(): string {
  return new Date().toISOString()
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
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

  async markWatched(mediaId, mediaType, watchedAt) {
    const existing = get().entries[mediaId]
    const timestamp = now()
    const entry: LibraryEntry = existing
      ? { ...existing, status: 'completed', updatedAt: timestamp }
      : {
          id: mediaId,
          mediaId,
          mediaType,
          status: 'completed',
          isFavorite: false,
          addedAt: timestamp,
          updatedAt: timestamp,
        }
    const hasRecord = get().watchRecords.some((r) => r.mediaId === mediaId)
    await storage.putLibraryEntry(entry)
    set((state) => ({ entries: { ...state.entries, [mediaId]: entry } }))

    if (!hasRecord) {
      const record: WatchRecord = {
        id: generateId(),
        mediaId,
        mediaType,
        watchedAt: watchedAt ?? timestamp,
        isRewatch: false,
      }
      await storage.putWatchRecord(record)
      set((state) => ({ watchRecords: [...state.watchRecords, record] }))
    }
  },

  async markUnwatched(mediaId) {
    const existing = get().entries[mediaId]
    if (!existing) return
    await storage.deleteWatchRecordsForMedia(mediaId)
    const keepsEntry = existing.isFavorite || existing.status === 'planned'
    if (keepsEntry) {
      const updated: LibraryEntry = { ...existing, status: existing.isFavorite ? undefined : 'planned', updatedAt: now() }
      await storage.putLibraryEntry(updated)
      set((state) => ({
        entries: { ...state.entries, [mediaId]: updated },
        watchRecords: state.watchRecords.filter((r) => r.mediaId !== mediaId),
      }))
    } else {
      await storage.deleteLibraryEntry(mediaId)
      set((state) => {
        const entries = { ...state.entries }
        delete entries[mediaId]
        return { entries, watchRecords: state.watchRecords.filter((r) => r.mediaId !== mediaId) }
      })
    }
  },

  async rewatch(mediaId, mediaType, watchedAt) {
    const existing = get().entries[mediaId]
    const timestamp = now()
    const entry: LibraryEntry = existing
      ? { ...existing, status: 'completed', updatedAt: timestamp }
      : {
          id: mediaId,
          mediaId,
          mediaType,
          status: 'completed',
          isFavorite: false,
          addedAt: timestamp,
          updatedAt: timestamp,
        }
    const record: WatchRecord = {
      id: generateId(),
      mediaId,
      mediaType,
      watchedAt: watchedAt ?? timestamp,
      isRewatch: true,
    }
    await Promise.all([storage.putLibraryEntry(entry), storage.putWatchRecord(record)])
    set((state) => ({
      entries: { ...state.entries, [mediaId]: entry },
      watchRecords: [...state.watchRecords, record],
    }))
  },

  async setWatching(mediaId, mediaType) {
    const existing = get().entries[mediaId]
    const timestamp = now()
    const entry: LibraryEntry = existing
      ? { ...existing, status: 'watching', updatedAt: timestamp }
      : { id: mediaId, mediaId, mediaType, status: 'watching', isFavorite: false, addedAt: timestamp, updatedAt: timestamp }
    await storage.putLibraryEntry(entry)
    set((state) => ({ entries: { ...state.entries, [mediaId]: entry } }))
  },

  async setDropped(mediaId, mediaType) {
    const existing = get().entries[mediaId]
    const timestamp = now()
    const entry: LibraryEntry = existing
      ? { ...existing, status: 'dropped', updatedAt: timestamp }
      : { id: mediaId, mediaId, mediaType, status: 'dropped', isFavorite: false, addedAt: timestamp, updatedAt: timestamp }
    await storage.putLibraryEntry(entry)
    set((state) => ({ entries: { ...state.entries, [mediaId]: entry } }))
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
    await storage.putLibraryEntry(entry)
    set((state) => ({ entries: { ...state.entries, [mediaId]: entry } }))
  },

  async removeFromWatchlist(mediaId) {
    const existing = get().entries[mediaId]
    if (!existing) return
    const keepsEntry = existing.isFavorite
    if (keepsEntry) {
      const updated: LibraryEntry = {
        ...existing,
        status: undefined,
        watchlistPriority: undefined,
        watchlistNote: undefined,
        watchlistOrder: undefined,
        updatedAt: now(),
      }
      await storage.putLibraryEntry(updated)
      set((state) => ({ entries: { ...state.entries, [mediaId]: updated } }))
    } else {
      await storage.deleteLibraryEntry(mediaId)
      set((state) => {
        const entries = { ...state.entries }
        delete entries[mediaId]
        return { entries }
      })
    }
  },

  async reorderWatchlist(orderedMediaIds) {
    const timestamp = now()
    const updates: LibraryEntry[] = []
    orderedMediaIds.forEach((mediaId, index) => {
      const existing = get().entries[mediaId]
      if (existing) updates.push({ ...existing, watchlistOrder: index, updatedAt: timestamp })
    })
    await Promise.all(updates.map((e) => storage.putLibraryEntry(e)))
    set((state) => {
      const entries = { ...state.entries }
      updates.forEach((e) => (entries[e.mediaId] = e))
      return { entries }
    })
  },

  async toggleFavorite(mediaId, mediaType) {
    const existing = get().entries[mediaId]
    const timestamp = now()
    const entry: LibraryEntry = existing
      ? { ...existing, isFavorite: !existing.isFavorite, updatedAt: timestamp }
      : { id: mediaId, mediaId, mediaType, status: undefined, isFavorite: true, addedAt: timestamp, updatedAt: timestamp }
    await storage.putLibraryEntry(entry)
    set((state) => ({ entries: { ...state.entries, [mediaId]: entry } }))
  },

  async removeFromLibrary(mediaId) {
    await Promise.all([storage.deleteLibraryEntry(mediaId), storage.deleteWatchRecordsForMedia(mediaId)])
    set((state) => {
      const entries = { ...state.entries }
      delete entries[mediaId]
      return {
        entries,
        watchRecords: state.watchRecords.filter((r) => r.mediaId !== mediaId),
        episodeProgress: state.episodeProgress.filter((p) => p.showId !== mediaId),
      }
    })
  },

  isEpisodeWatched(showId, seasonNumber, episodeNumber) {
    const id = episodeProgressId(showId, seasonNumber, episodeNumber)
    return get().episodeProgress.some((p) => p.id === id && p.watched)
  },

  async markEpisodeWatched(showId, seasonNumber, episodeNumber, watchedAt) {
    const id = episodeProgressId(showId, seasonNumber, episodeNumber)
    const progress: EpisodeProgress = { id, showId, seasonNumber, episodeNumber, watched: true, watchedAt: watchedAt ?? now() }
    await storage.putEpisodeProgress(progress)
    set((state) => ({ episodeProgress: [...state.episodeProgress.filter((p) => p.id !== id), progress] }))
  },

  async markEpisodeUnwatched(showId, seasonNumber, episodeNumber) {
    const id = episodeProgressId(showId, seasonNumber, episodeNumber)
    const progress: EpisodeProgress = { id, showId, seasonNumber, episodeNumber, watched: false, watchedAt: null }
    await storage.putEpisodeProgress(progress)
    set((state) => ({ episodeProgress: [...state.episodeProgress.filter((p) => p.id !== id), progress] }))
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
    }))
    await storage.putEpisodeProgressBatch(items)
    const ids = new Set(items.map((i) => i.id))
    set((state) => ({ episodeProgress: [...state.episodeProgress.filter((p) => !ids.has(p.id)), ...items] }))
  },

  async markAllEpisodesWatched(showId, seasons) {
    const timestamp = now()
    const items: EpisodeProgress[] = seasons.flatMap((season) =>
      season.episodes.map((ep) => ({
        id: episodeProgressId(showId, ep.seasonNumber, ep.episodeNumber),
        showId,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        watched: true,
        watchedAt: timestamp,
      })),
    )
    await storage.putEpisodeProgressBatch(items)
    const ids = new Set(items.map((i) => i.id))
    set((state) => ({ episodeProgress: [...state.episodeProgress.filter((p) => !ids.has(p.id)), ...items] }))
    await get().syncShowStatusFromProgress(showId, seasons)
  },

  async syncShowStatusFromProgress(showId, seasons) {
    const completion = getShowCompletion(seasons, get().episodeProgress)
    if (completion.totalCount === 0) return
    if (completion.watchedCount === 0) return
    const status = completion.percent >= 100 ? 'completed' : 'watching'
    const existing = get().entries[showId]
    const timestamp = now()
    const entry: LibraryEntry = existing
      ? { ...existing, status, updatedAt: timestamp }
      : { id: showId, mediaId: showId, mediaType: 'tv', status, isFavorite: false, addedAt: timestamp, updatedAt: timestamp }
    await storage.putLibraryEntry(entry)
    set((state) => ({ entries: { ...state.entries, [showId]: entry } }))
  },
}))
