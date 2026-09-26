import { create } from 'zustand'
import { storage } from '@/services/storage/repository'
import type { MediaSummary } from '@/types/media'

interface MediaCacheState {
  hydrated: boolean
  items: Record<string, MediaSummary>

  hydrate: () => Promise<void>
  get: (id: string) => MediaSummary | undefined
  cache: (items: MediaSummary[]) => Promise<void>
}

export const useMediaCacheStore = create<MediaCacheState>((set, get) => ({
  hydrated: false,
  items: {},

  async hydrate() {
    const items = await storage.getAllMediaCache()
    set({ items: Object.fromEntries(items.map((i) => [i.id, i])), hydrated: true })
  },

  get(id) {
    return get().items[id]
  },

  async cache(items) {
    if (items.length === 0) return
    set((state) => {
      const next = { ...state.items }
      for (const item of items) next[item.id] = item
      return { items: next }
    })
    // Only a cache of TMDB metadata - a failed write costs a re-fetch
    // later, not user data, so it isn't worth interrupting anyone over.
    await storage.cacheMedia(items).catch(() => {})
  },
}))
