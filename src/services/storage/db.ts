import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
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
import type { UserProfile, UserSettings } from '@/types/user'

/**
 * Every persisted shape lives here, in one schema, so the storage layer is
 * the single place that knows IndexedDB exists. Nothing in components,
 * pages, or even the Zustand stores should import `idb` directly - they go
 * through the repository functions in `./repository.ts` instead. That is
 * what lets the engine move to Supabase/Firebase later without touching UI
 * code (see README's data-architecture section).
 */
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
  ratings: {
    key: string
    value: Rating
  }
  reviews: {
    key: string
    value: Review
  }
  favoritePeople: {
    key: string
    value: FavoritePerson
  }
  lists: {
    key: string
    value: CustomList
  }
  mediaCache: {
    key: string
    value: MediaSummary
  }
  meta: {
    key: string
    value: UserProfile | UserSettings
  }
}

let dbPromise: Promise<IDBPDatabase<MovieTrackerDB>> | null = null

export function getDB(): Promise<IDBPDatabase<MovieTrackerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MovieTrackerDB>(STORAGE_DB_NAME, STORAGE_DB_VERSION, {
      upgrade(db) {
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
      },
    })
  }
  return dbPromise
}
