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
