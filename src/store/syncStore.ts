import { create } from 'zustand'
import { isGoogleConfigured, type AuthFailureReason } from '@/services/auth/google'

/**
 * - disabled: this build has no Google client configured (local-only)
 * - idle: everything on this device is on Drive, as far as we know
 * - syncing: a check/upload is in flight
 * - offline: no network - edits are kept and go up once it's back
 * - needsAuth: the Google session needs renewing (edits are kept)
 * - error: Drive refused something the user may need to know about
 */
export type SyncPhase = 'disabled' | 'idle' | 'syncing' | 'offline' | 'needsAuth' | 'error'

interface SyncStoreState {
  phase: SyncPhase
  /** There are local edits Drive doesn't have yet. */
  dirty: boolean
  lastSyncedAt: number | null
  error: string | null
  /** The last sign-in redirect's failure, for the screen that started it. */
  authFailure: { reason: AuthFailureReason; message: string; silent: boolean } | null
}

/** Written only by src/services/sync/engine.ts; read by the UI. */
export const useSyncStore = create<SyncStoreState>(() => ({
  phase: isGoogleConfigured() ? 'idle' : 'disabled',
  dirty: false,
  lastSyncedAt: null,
  error: null,
  authFailure: null,
}))
