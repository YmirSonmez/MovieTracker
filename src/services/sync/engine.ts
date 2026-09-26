import * as drive from './drive'
import { decodeSnapshot, encodeSnapshot } from './codec'
import {
  getLocalMax,
  onLocalChange,
  snapshotFromLegacyBundle,
  storage,
  SNAPSHOT_SCHEMA,
  type SyncSnapshot,
} from '@/services/storage/repository'
import type { SyncState } from '@/services/storage/db'
import {
  beginSignIn,
  forgetAccount,
  getAccessToken,
  getAccount,
  hasScope,
  invalidateToken,
  isGoogleConfigured,
  SCOPE_FILE,
  shouldRenewSilently,
} from '@/services/auth/google'
import { useSyncStore, type SyncPhase } from '@/store/syncStore'
import { hydrateAllStores } from '@/store/init'
import { parseImportBundle } from '@/utils/exportImport'

/**
 * Keeps this device and the account's copy on Drive in step, in the
 * background, without ever asking the user to choose between them.
 *
 * Each run: one metadata request to see whether Drive's copy changed since
 * we last saw it; if it did, download and merge it record by record (newer
 * clock wins, deletions included); then, if this device has anything Drive
 * doesn't, upload the merged whole. Every device keeps the full data
 * locally, so if two devices write at the same moment and one overwrites
 * the other, the loser still has its edits and simply puts them back on its
 * next run - nothing depends on the upload order.
 */

/** Wait for a burst of edits (marking a whole season) to settle. */
const CHANGE_DEBOUNCE_MS = 1500
/** Picks up other devices' edits while the app sits open. One tiny
 * metadata request when nothing changed. */
const POLL_MS = 60_000
const FOCUS_MIN_GAP_MS = 10_000
/** Back after this long with an expired token: renew it right away, the
 * same way a fresh page load would. */
const LONG_AWAY_MS = 10 * 60_000

let running: Promise<void> | null = null
let rerun = false
let changeCounter = 0
let lastAttemptAt = 0
let debounceTimer: ReturnType<typeof setTimeout> | undefined

function setPhase(phase: SyncPhase, extra: Partial<ReturnType<typeof useSyncStore.getState>> = {}): void {
  useSyncStore.setState({ phase, ...extra })
}

function newEpoch(): string {
  return crypto.randomUUID()
}

function isNetworkError(error: unknown): boolean {
  return !navigator.onLine || (error instanceof TypeError && /fetch|network|load failed/i.test(error.message))
}

/** Reloads the in-memory stores from IndexedDB after a merge - again if a
 * local edit landed while it was reading, so the UI never shows a copy
 * that's missing the edit the user just made. */
async function rehydrate(): Promise<void> {
  let seen: number
  do {
    seen = changeCounter
    await hydrateAllStores()
  } while (seen !== changeCounter)
}

async function upload(token: string, state: SyncState, fileId: string | null): Promise<drive.RemoteFile> {
  const { snapshot, builtUpTo } = await storage.buildSnapshot(state.epoch!)
  const bytes = await encodeSnapshot(snapshot)
  const written = fileId ? await drive.updateSyncFile(token, fileId, bytes) : await drive.createSyncFile(token, bytes)
  state.fileId = written.id
  state.remoteVersion = written.version
  state.syncedUpTo = Math.max(state.syncedUpTo, builtUpTo)
  return written
}

async function download(token: string, fileId: string): Promise<SyncSnapshot> {
  return decodeSnapshot(await drive.downloadFile(token, fileId))
}

/** Merges the previous design's `movie-tracker-backup.json`, if there is
 * one - once per account, only when the account has no synced data yet. */
async function importLegacyBackup(token: string, epoch: string): Promise<boolean> {
  if (!hasScope(SCOPE_FILE)) return false
  const legacy = await drive.findLegacyBackup(token)
  if (!legacy) return false
  try {
    const bundle = parseImportBundle(new TextDecoder().decode(await drive.downloadFile(token, legacy.id)))
    return (await storage.applyRemoteSnapshot(snapshotFromLegacyBundle(bundle, epoch))).changed
  } catch {
    // An unreadable old backup shouldn't block syncing everything else.
    return false
  }
}

/** Two devices that both found no file can both create one. Right after
 * creating, look again: if someone else's is older, merge it in, move onto
 * it, and remove ours - every device agrees on the oldest. */
async function settleCreationRace(token: string, state: SyncState, created: drive.RemoteFile): Promise<boolean> {
  const files = await drive.listSyncFiles(token)
  const canonical = files[0]
  if (!canonical || canonical.id === created.id) return false
  const remote = await download(token, canonical.id)
  const result = await storage.applyRemoteSnapshot(remote)
  state.epoch = remote.epoch
  await upload(token, state, canonical.id)
  await drive.deleteFile(token, created.id).catch(() => {})
  return result.changed
}

async function syncWithDrive(token: string, email: string): Promise<SyncState> {
  const stored = await storage.getSyncState()
  const state: SyncState = stored?.account === email ? { ...stored } : { account: email, syncedUpTo: 0 }
  let changed = false
  let needUpload = false

  let file = state.fileId ? await drive.getFile(token, state.fileId) : null
  if (!file) {
    const files = await drive.listSyncFiles(token)
    file = files[0] ?? null
    // Leftovers from an interrupted creation race - fold them in.
    for (const extra of files.slice(1)) {
      changed = (await storage.applyRemoteSnapshot(await download(token, extra.id))).changed || changed
      await drive.deleteFile(token, extra.id).catch(() => {})
      needUpload = true
    }
  }

  if (!file) {
    // Nothing on Drive yet: the account's first device.
    state.epoch ??= newEpoch()
    if (!state.legacyChecked) {
      changed = (await importLegacyBackup(token, state.epoch)) || changed
      state.legacyChecked = true
    }
    needUpload = true
  } else if (file.id !== state.fileId || file.version !== state.remoteVersion) {
    const remote = await download(token, file.id)
    // A different epoch than the one this device last synced under means
    // the account's data was deleted from another device - drop ours
    // instead of uploading it back. (A device joining for the first time
    // has no epoch yet and merges normally.)
    const epochChanged = Boolean(state.epoch) && remote.epoch !== state.epoch
    const result = await storage.applyRemoteSnapshot(remote, { replaceLocal: epochChanged })
    changed = result.changed || changed
    if (result.localAhead) needUpload = true
    state.epoch = remote.epoch
    state.fileId = file.id
    state.remoteVersion = file.version
    state.legacyChecked = true
  }

  if (getLocalMax() > state.syncedUpTo) needUpload = true
  if (changed) await rehydrate()

  if (needUpload) {
    const written = await upload(token, state, file?.id ?? null)
    if (!file && (await settleCreationRace(token, state, written))) await rehydrate()
  }

  state.lastSyncedAt = Date.now()
  await storage.putSyncState(state)
  return state
}

async function runOnce(): Promise<void> {
  if (!isGoogleConfigured()) return setPhase('disabled')
  const account = getAccount()
  if (!account) return
  if (!navigator.onLine) return setPhase('offline')
  const token = getAccessToken()
  if (!token) return setPhase('needsAuth')

  lastAttemptAt = Date.now()
  setPhase('syncing')
  try {
    const state = await syncWithDrive(token, account.email)
    setPhase('idle', { error: null, lastSyncedAt: state.lastSyncedAt ?? null, dirty: getLocalMax() > state.syncedUpTo })
  } catch (error) {
    if (error instanceof drive.DriveAuthError) {
      invalidateToken()
      setPhase('needsAuth')
    } else if (isNetworkError(error)) {
      setPhase('offline')
    } else {
      setPhase('error', { error: error instanceof Error ? error.message : 'Eşitleme başarısız oldu.' })
    }
  }
}

/** Runs a sync now, or - if one is already running - once more right after
 * it, so an edit made mid-sync is never left behind. */
export function syncNow(): Promise<void> {
  if (running) {
    rerun = true
    return running
  }
  running = (async () => {
    do {
      rerun = false
      await runOnce()
    } while (rerun)
  })().finally(() => {
    running = null
  })
  return running
}

/** Nothing on screen that a page reload would throw away. */
function isSafeToLeavePage(): boolean {
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return false
  const active = document.activeElement
  return !(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
}

/** Starts background sync for the linked account. Returns a stop function. */
export function startSync(): () => void {
  let hiddenAt = 0

  const offChange = onLocalChange(() => {
    changeCounter++
    useSyncStore.setState({ dirty: true })
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => void syncNow(), CHANGE_DEBOUNCE_MS)
  })

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      // Leaving the app (or the phone locking) - push pending edits now
      // rather than when the debounce would have fired.
      if (useSyncStore.getState().dirty) {
        clearTimeout(debounceTimer)
        void syncNow()
      }
      return
    }
    if (hiddenAt && Date.now() - hiddenAt > LONG_AWAY_MS && shouldRenewSilently() && isSafeToLeavePage()) {
      beginSignIn({ silent: true })
      return
    }
    if (Date.now() - lastAttemptAt > FOCUS_MIN_GAP_MS) void syncNow()
  }
  const onOnline = () => void syncNow()
  const onOffline = () => setPhase('offline')

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  const poll = setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow()
  }, POLL_MS)

  void (async () => {
    const state = await storage.getSyncState()
    useSyncStore.setState({
      lastSyncedAt: state?.lastSyncedAt ?? null,
      dirty: getLocalMax() > (state?.syncedUpTo ?? 0),
    })
    await syncNow()
  })()

  return () => {
    offChange()
    clearTimeout(debounceTimer)
    clearInterval(poll)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

/** Whether this device has ever completed a sync with its account - a
 * first-time device waits for that before showing an empty library. */
export async function hasSyncedBefore(): Promise<boolean> {
  return Boolean((await storage.getSyncState())?.lastSyncedAt)
}

/** Right after a sign-in: data left on this device by a *different*
 * account (signed out without wiping, or storage outlived the sign-in)
 * must not leak into this one. */
export async function prepareDeviceForAccount(email: string): Promise<void> {
  const state = await storage.getSyncState()
  if (state && state.account !== email) await storage.wipeLocal()
}

/** Tries to get pending edits onto Drive before the device is signed out.
 * Resolves to whether nothing is left unsynced. */
export async function flushPendingChanges(): Promise<boolean> {
  if (!useSyncStore.getState().dirty) return true
  if (getAccessToken() && navigator.onLine) await syncNow()
  return !useSyncStore.getState().dirty
}

/** Signs this device out: forgets the account and deletes its local copy
 * (Drive keeps everything), then restarts on the sign-in screen. */
export async function signOut(): Promise<void> {
  forgetAccount()
  await storage.wipeLocal()
  window.history.replaceState(null, '', `${window.location.pathname}#/login`)
  window.location.reload()
}

export class DeleteAllError extends Error {}

/**
 * Deletes the account's data everywhere. Drive gets an empty copy under a
 * new epoch *before* anything local is touched: if that upload fails,
 * nothing is lost, and once it succeeds, every other device sees the new
 * epoch on its next sync and drops its copy instead of re-uploading it.
 */
export async function deleteAllData(): Promise<void> {
  const account = getAccount()
  if (!isGoogleConfigured() || !account) {
    await storage.wipeLocal()
    await rehydrate()
    return
  }
  const token = getAccessToken()
  if (!token || !navigator.onLine) {
    throw new DeleteAllError('Her yerden silmek için internet bağlantısı ve etkin bir Google oturumu gerekiyor.')
  }
  if (running) await running

  const epoch = newEpoch()
  const empty: SyncSnapshot = { app: 'movie-tracker', schema: SNAPSHOT_SCHEMA, epoch, writtenAt: Date.now(), tables: {}, media: [] }
  const bytes = await encodeSnapshot(empty)
  const stored = await storage.getSyncState()
  const existing = stored?.fileId ? await drive.getFile(token, stored.fileId) : ((await drive.listSyncFiles(token))[0] ?? null)
  const written = existing ? await drive.updateSyncFile(token, existing.id, bytes) : await drive.createSyncFile(token, bytes)

  if (hasScope(SCOPE_FILE)) {
    const legacy = await drive.findLegacyBackup(token).catch(() => null)
    if (legacy) await drive.deleteFile(token, legacy.id).catch(() => {})
  }

  await storage.wipeLocal()
  await storage.putSyncState({
    account: account.email,
    fileId: written.id,
    remoteVersion: written.version,
    epoch,
    syncedUpTo: getLocalMax(),
    lastSyncedAt: Date.now(),
    legacyChecked: true,
  })
  await rehydrate()
  setPhase('idle', { dirty: false, error: null, lastSyncedAt: Date.now() })
}
