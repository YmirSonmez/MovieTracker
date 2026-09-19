import type { MediaType } from './media'

export type WatchStatus = 'watching' | 'completed' | 'planned' | 'dropped'

export type WatchlistPriority = 'high' | 'medium' | 'low'

/**
 * The single row per (user, media item). This is the one source of truth
 * for "where does this title stand for the user" - the Library tabs,
 * the Watchlist page, and favorites are all views/filters over this table,
 * never separate stores. That is what keeps "mark watched" a one-click
 * action without risking duplicate or conflicting records across pages.
 */
export interface LibraryEntry {
  id: string
  mediaId: string
  mediaType: MediaType
  /** Undefined means "tracked for some other reason" (favorited or rated
   * without a committed watch status) - only the four literal values show
   * up in a Library status tab. */
  status?: WatchStatus
  isFavorite: boolean
  addedAt: string
  updatedAt: string
  /** Only meaningful while status === 'planned'; preserved if the user
   * later moves the item back to planned so priority/notes aren't lost. */
  watchlistPriority?: WatchlistPriority
  watchlistNote?: string
  watchlistOrder?: number
}

/** One row per watch event, so rewatches accumulate history instead of
 * overwriting a single "watched date". */
export interface WatchRecord {
  id: string
  mediaId: string
  mediaType: MediaType
  watchedAt: string
  isRewatch: boolean
  /** Optional snapshot of how the user felt about this specific viewing;
   * the canonical, editable rating shown across the UI lives in Rating. */
  rating?: number
}

/** One row per episode the user has ever interacted with. Re-marking an
 * episode watched updates watchedAt in place rather than appending, which
 * is what keeps "mark all episodes watched" idempotent and duplicate-free. */
export interface EpisodeProgress {
  id: string
  showId: string
  seasonNumber: number
  episodeNumber: number
  watched: boolean
  watchedAt: string | null
}

/** Current, editable rating for a title. 0.5 increments, 0.5 to 5. */
export interface Rating {
  id: string
  mediaId: string
  mediaType: MediaType
  value: number
  createdAt: string
  updatedAt: string
}

export interface Review {
  id: string
  mediaId: string
  mediaType: MediaType
  text: string
  createdAt: string
  updatedAt: string
}

/** Favoriting a person (actor/director). Favoriting a movie or show is just
 * LibraryEntry.isFavorite, so this only exists for the person case, which
 * has no other home. */
export interface FavoritePerson {
  id: string
  personId: string
  personName: string
  profilePath: string | null
  role: 'actor' | 'director' | 'person'
  addedAt: string
}

export interface CustomList {
  id: string
  name: string
  description?: string
  coverImagePath?: string | null
  itemIds: string[]
  createdAt: string
  updatedAt: string
  isPrivate?: boolean
}
