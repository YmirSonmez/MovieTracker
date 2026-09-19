export interface UserProfile {
  displayName: string
  avatarEmoji: string
  joinedAt: string
  favoriteGenreIds: number[]
  favoriteMediaIds: string[]
}

export type ThemePreference = 'dark' | 'light' | 'system'

/**
 * 'local' is the only mode this build actually implements. 'cloud' exists so
 * the settings UI and store shape do not need to change when a real backend
 * (Supabase/Firebase/Drive) is wired in later - see README's roadmap
 * section. Never let the UI claim 'cloud' does anything today.
 */
export type DataMode = 'local' | 'cloud'

export interface UserSettings {
  theme: ThemePreference
  compactLayout: boolean
  autoMarkNextEpisode: boolean
  confirmBeforeMarkingWatched: boolean
  dataMode: DataMode
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  compactLayout: false,
  autoMarkNextEpisode: false,
  confirmBeforeMarkingWatched: false,
  dataMode: 'local',
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

/** Local pointer/cache for the Google Drive backup file - never exported,
 * never contains a token (Drive access tokens are short-lived and are only
 * ever held in memory for the current session). */
export interface CloudSyncMeta {
  driveFileId?: string
  lastSyncedAt?: string
}

export const DEFAULT_CLOUD_SYNC_META: CloudSyncMeta = {}
