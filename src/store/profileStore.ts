import { create } from 'zustand'
import { storage } from '@/services/storage/repository'
import { DEFAULT_SETTINGS } from '@/types/user'
import type { UserProfile, UserSettings } from '@/types/user'

const DEFAULT_PROFILE: Omit<UserProfile, 'joinedAt'> = {
  displayName: 'Film Sever',
  avatarEmoji: '🎬',
  favoriteGenreIds: [],
  favoriteMediaIds: [],
}

interface ProfileState {
  hydrated: boolean
  profile: UserProfile
  settings: UserSettings

  hydrate: () => Promise<void>
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  hydrated: false,
  profile: { ...DEFAULT_PROFILE, joinedAt: new Date().toISOString() },
  settings: DEFAULT_SETTINGS,

  async hydrate() {
    const [storedProfile, storedSettings] = await Promise.all([storage.getProfile(), storage.getSettings()])
    const profile = storedProfile ?? { ...DEFAULT_PROFILE, joinedAt: new Date().toISOString() }
    const settings = storedSettings ?? DEFAULT_SETTINGS
    if (!storedProfile) await storage.putProfile(profile)
    if (!storedSettings) await storage.putSettings(settings)
    set({ profile, settings, hydrated: true })
  },

  async updateProfile(patch) {
    const updated = { ...get().profile, ...patch }
    await storage.putProfile(updated)
    set({ profile: updated })
  },

  async updateSettings(patch) {
    const updated = { ...get().settings, ...patch }
    await storage.putSettings(updated)
    set({ settings: updated })
  },
}))
