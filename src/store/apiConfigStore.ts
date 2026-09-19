import { create } from 'zustand'
import { storage } from '@/services/storage/repository'
import { DEFAULT_API_CONFIG } from '@/types/user'
import type { ApiConfig } from '@/types/user'

interface ApiConfigState {
  hydrated: boolean
  config: ApiConfig

  hydrate: () => Promise<void>
  updateConfig: (patch: Partial<ApiConfig>) => Promise<void>
}

/** The visitor's own TMDB key, entered in Settings. Read synchronously (via
 * getState()) from src/api/tmdb/client.ts, which cannot depend on React. */
export const useApiConfigStore = create<ApiConfigState>((set, get) => ({
  hydrated: false,
  config: DEFAULT_API_CONFIG,

  async hydrate() {
    const stored = await storage.getApiConfig()
    set({ config: stored ?? DEFAULT_API_CONFIG, hydrated: true })
  },

  async updateConfig(patch) {
    const updated = { ...get().config, ...patch }
    await storage.putApiConfig(updated)
    set({ config: updated })
  },
}))
