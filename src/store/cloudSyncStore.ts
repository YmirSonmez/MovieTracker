import { create } from 'zustand'
import { storage } from '@/services/storage/repository'
import { DEFAULT_CLOUD_SYNC_META } from '@/types/user'
import type { CloudSyncMeta } from '@/types/user'
import type { ImportPreview, MovieTrackerExport } from '@/types/export'

export type CloudSyncStatus = 'idle' | 'connecting' | 'backing-up' | 'restoring'

/** A Drive backup that was already downloaded (e.g. by the connect banner
 * hitting a conflict) and is waiting for Veri Yönetimi to pick it up and
 * show it, so connecting on a new device is one trip instead of "connect,
 * notice a toast, navigate, then remember to press restore yourself too". */
export interface PendingDriveImport {
  bundle: MovieTrackerExport
  preview: ImportPreview
}

interface CloudSyncState {
  hydrated: boolean
  meta: CloudSyncMeta
  /** In-memory only - who is currently connected. Cleared on disconnect or
   * page reload; never persisted (only the access token would need that,
   * and that never gets persisted either). */
  connectedEmail: string | null
  status: CloudSyncStatus
  pendingImport: PendingDriveImport | null

  hydrate: () => Promise<void>
  setConnectedEmail: (email: string | null) => void
  setStatus: (status: CloudSyncStatus) => void
  updateMeta: (patch: Partial<CloudSyncMeta>) => Promise<void>
  setPendingImport: (value: PendingDriveImport | null) => void
}

export const useCloudSyncStore = create<CloudSyncState>((set, get) => ({
  hydrated: false,
  meta: DEFAULT_CLOUD_SYNC_META,
  connectedEmail: null,
  status: 'idle',
  pendingImport: null,

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

  setPendingImport(value) {
    set({ pendingImport: value })
  },
}))
