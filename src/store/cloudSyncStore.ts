import { create } from 'zustand'
import { storage } from '@/services/storage/repository'
import { DEFAULT_CLOUD_SYNC_META } from '@/types/user'
import type { CloudSyncMeta } from '@/types/user'

export type CloudSyncStatus = 'idle' | 'connecting' | 'backing-up' | 'restoring'

interface CloudSyncState {
  hydrated: boolean
  meta: CloudSyncMeta
  /** In-memory only - who is currently connected. Cleared on disconnect or
   * page reload; never persisted (only the access token would need that,
   * and that never gets persisted either). */
  connectedEmail: string | null
  status: CloudSyncStatus

  hydrate: () => Promise<void>
  setConnectedEmail: (email: string | null) => void
  setStatus: (status: CloudSyncStatus) => void
  updateMeta: (patch: Partial<CloudSyncMeta>) => Promise<void>
}

export const useCloudSyncStore = create<CloudSyncState>((set, get) => ({
  hydrated: false,
  meta: DEFAULT_CLOUD_SYNC_META,
  connectedEmail: null,
  status: 'idle',

  async hydrate() {
    const stored = await storage.getCloudSyncMeta()
    set({ meta: stored ?? DEFAULT_CLOUD_SYNC_META, hydrated: true })
  },

  setConnectedEmail(email) {
    set({ connectedEmail: email })
  },

  setStatus(status) {
    set({ status })
  },

  async updateMeta(patch) {
    const updated = { ...get().meta, ...patch }
    await storage.putCloudSyncMeta(updated)
    set({ meta: updated })
  },
}))
