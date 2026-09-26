export interface UserProfile {
  displayName: string
  avatarEmoji: string
  joinedAt: string
  favoriteGenreIds: number[]
  favoriteMediaIds: string[]
}

export type ThemePreference = 'dark' | 'light' | 'system'

export interface UserSettings {
  theme: ThemePreference
  compactLayout: boolean
  autoMarkNextEpisode: boolean
  confirmBeforeMarkingWatched: boolean
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  compactLayout: false,
  autoMarkNextEpisode: false,
  confirmBeforeMarkingWatched: false,
}

/**
 * A visitor's own TMDB key, entered in Settings. Kept separate from
 * UserSettings because it travels with backups (per the user's explicit
 * choice) and callers that only need app preferences shouldn't need to
 * touch anything key-shaped.
 */
export interface ApiConfig {
  tmdbApiKey?: string
}

export const DEFAULT_API_CONFIG: ApiConfig = {}
