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
import type { UserProfile, UserSettings } from './user'

/**
 * The full portable snapshot of a user's data. This is the ONLY format
 * import/export ever reads or writes - every store's data lives in here so
 * "export everything" and "restore backup" are never partial.
 *
 * `mediaCache` travels with the export so a restored library still shows
 * real titles/posters even before the API layer re-fetches anything (or
 * when no TMDB key is configured at all).
 */
export interface MovieTrackerExport {
  version: number
  exportedAt: string
  profile: UserProfile
  settings: UserSettings
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
