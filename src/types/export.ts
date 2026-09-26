import type { MediaSummary } from './media'
import type {
  CustomList,
  EpisodeProgress,
  FavoritePerson,
  LibraryEntry,
  Rating,
  Review,
  WatchRecord,
} from './watch'
import type { ApiConfig, UserProfile, UserSettings } from './user'

/**
 * The full portable snapshot of a user's data. This is the ONLY format
 * import/export ever reads or writes - every store's data lives in here so
 * "export everything" and "restore backup" are never partial.
 *
 * `mediaCache` travels with the export so a restored library still shows
 * real titles/posters even before the API layer re-fetches anything (or
 * when no TMDB key is configured at all).
 *
 * `apiConfig` (the user's personal TMDB key, if they set one) travels here
 * too, by explicit user choice, so restoring a backup on another device
 * also restores live-data access without re-typing the key. This means any
 * exported/uploaded backup file contains that key in plain text - callers
 * that let a user share or publish a backup file must warn about that.
 */
export interface MovieTrackerExport {
  version: number
  exportedAt: string
  profile: UserProfile
  settings: UserSettings
  apiConfig: ApiConfig
  libraryEntries: LibraryEntry[]
  watchRecords: WatchRecord[]
  episodeProgress: EpisodeProgress[]
  ratings: Rating[]
  reviews: Review[]
  favoritePeople: FavoritePerson[]
  lists: CustomList[]
  mediaCache: MediaSummary[]
}

export type ImportStrategy = 'merge' | 'replace'

export interface ImportPreview {
  version: number
  isSupported: boolean
  containsApiKey: boolean
  counts: {
    libraryEntries: number
    watchRecords: number
    episodeProgress: number
    ratings: number
    reviews: number
    lists: number
    favoritePeople: number
  }
}
