import * as drive from './drive'
import { decodeSnapshot, encodeSnapshot, SnapshotFormatError } from './codec'
import {
  getLastStamp,
  getLocalMax,
  observeStamp,
  onLocalChange,
  snapshotFromLegacyBundle,
  storage,
  writesSettled,
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
  normalizeEmail,
  SCOPE_FILE,
  shouldRenewSilently,
} from '@/services/auth/google'
import { useSyncStore, type SyncPhase, type SyncProblem } from '@/store/syncStore'
import { hydrateAllStores } from '@/store/init'
import { parseImportBundle } from '@/utils/exportImport'
import { ROUTES } from '@/utils/routes'

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
 * metadata request (a few hundred bytes) when nothing changed. */
const POLL_MS = 15_000
const FOCUS_MIN_GAP_MS = 10_000
/** After a failed attempt, background syncs wait this long before trying
 * again (growing with each failure in a row); a tap on the sync chip always
 * goes right away. Keeps a full Drive or a Google outage from being hammered
 * every 15 seconds, while still recovering by itself once it clears. */
const RETRY_BACKOFF_MS = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000]

let running: Promise<void> | null = null
let rerun = false
let rerunManual = false
let changeCounter = 0
let lastAttemptAt = 0
let debounceTimer: ReturnType<typeof setTimeout> | undefined
let failuresInRow = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined

function setPhase(phase: SyncPhase, extra: Partial<ReturnType<typeof useSyncStore.getState>> = {}): void {
  useSyncStore.setState({ phase, ...extra })
}

// ---------------------------------------------------------------------------
// Tabs. Every tab of the app shares one IndexedDB and one sync state, so
// they coordinate: one tab syncs at a time (a Web Lock), and a tab that
// changes the data - a local edit or a merge from Drive - tells the others
// to reload their stores, which would otherwise keep showing the old copy.

type TabMessage = { type: 'changed'; stamp: number } | { type: 'synced' } | { type: 'signedOut' }

const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('movie-tracker')
let tellTimer: ReturnType<typeof setTimeout> | undefined

function tell(message: TabMessage): void {
  channel?.postMessage(message)
}

/** Coalesces a burst of local edits into one message. */
function tellChanged(): void {
  clearTimeout(tellTimer)
  tellTimer = setTimeout(() => tell({ type: 'changed', stamp: getLastStamp() }), 50)
}

function withSyncLock(run: () => Promise<void>): Promise<void> {
  return navigator.locks ? navigator.locks.request('movie-tracker-sync', run) : run()
}

function newEpoch(): string {
  return crypto.randomUUID()
}

function isNetworkError(error: unknown): boolean {
  return !navigator.onLine || (error instanceof TypeError && /fetch|network|load failed/i.test(error.message))
}

/** Reloads the in-memory stores from IndexedDB after a merge. Waits for
 * in-flight writes first (the screen already shows them), and reads again
 * if another edit landed while it was reading - so the UI never shows a
 * copy that's missing the edit the user just made. */
async function rehydrate(): Promise<void> {
  let seen: number
  do {
    await writesSettled()
    seen = changeCounter
    await hydrateAllStores()
  } while (seen !== changeCounter)
}

async function upload(token: string, state: SyncState, fileId: string | null): Promise<drive.RemoteFile> {
  const { snapshot, builtUpTo } = await storage.buildSnapshot(state.epoch!, state.reset)
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

/**
 * Downloads a sync file; if it turns out to be unreadable (corrupted, cut
 * off mid-write), renames it out of the way and returns null instead of
 * failing every sync from now on. Renamed, not deleted: whatever is in it
 * stays recoverable. Problems waiting can fix (a newer app version, an old
 * browser) still throw.
 */
async function readOrQuarantine(token: string, fileId: string): Promise<SyncSnapshot | null> {
  try {
    return await download(token, fileId)
  } catch (error) {
    if (!(error instanceof SnapshotFormatError) || error.problem !== 'unreadable') throw error
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    await drive.renameFile(token, fileId, `${drive.SYNC_FILE_NAME}-unreadable-${stamp}`)
    return null
  }
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
  state.reset = remote.reset
  await upload(token, state, canonical.id)
  await drive.deleteFile(token, created.id).catch(() => {})
  return result.changed
}

async function syncWithDrive(token: string, email: string, transferring: () => void): Promise<SyncState> {
  const stored = await storage.getSyncState()
  const state: SyncState =
    stored && normalizeEmail(stored.account) === normalizeEmail(email) ? { ...stored } : { account: email, syncedUpTo: 0 }
  let changed = false
  let needUpload = false

  let file = state.fileId ? await drive.getFile(token, state.fileId) : null
  if (!file) {
    const files = await drive.listSyncFiles(token)
    file = files[0] ?? null
    // Leftovers from an interrupted creation race - fold them in.
    for (const extra of files.slice(1)) {
      transferring()
      const snapshot = await readOrQuarantine(token, extra.id)
      if (snapshot) {
        changed = (await storage.applyRemoteSnapshot(snapshot)).changed || changed
        await drive.deleteFile(token, extra.id).catch(() => {})
      }
      needUpload = true
    }
  }

  let remote: SyncSnapshot | null = null
  if (file && (file.id !== state.fileId || file.version !== state.remoteVersion)) {
    transferring()
    remote = await readOrQuarantine(token, file.id)
    // Unreadable and moved aside: carry on as if Drive had nothing, so
    // this device's copy becomes the account's copy again.
    if (!remote) {
      file = null
      state.fileId = undefined
      state.remoteVersion = undefined
      state.legacyChecked = true
    }
  }

  if (!file) {
    // Nothing on Drive yet: the account's first device.
    transferring()
    state.epoch ??= newEpoch()
    if (!state.legacyChecked) {
      changed = (await importLegacyBackup(token, state.epoch)) || changed
      state.legacyChecked = true
    }
    needUpload = true
  } else if (remote) {
    // A different epoch than the one this device last synced under, marked
    // as a reset, means the account's data was deleted from another device
    // - drop ours instead of uploading it back. Any other epoch change
    // (Drive's file was lost and recreated) merges normally: losing data
    // on a guess is far worse than a deletion having to be repeated. A
    // device joining for the first time has no epoch yet and merges too.
    const wipedElsewhere = Boolean(state.epoch) && remote.epoch !== state.epoch && remote.reset === true
    const result = await storage.applyRemoteSnapshot(remote, { replaceLocal: wipedElsewhere })
    changed = result.changed || changed
    if (result.localAhead) needUpload = true
    state.epoch = remote.epoch
    state.reset = remote.reset
    state.fileId = file.id
    state.remoteVersion = file.version
    state.legacyChecked = true
  }

  if (getLocalMax() > state.syncedUpTo) needUpload = true
  if (changed) {
    await rehydrate()
    tellChanged()
  }

  if (needUpload) {
    transferring()
    const written = await upload(token, state, file?.id ?? null)
    if (!file && (await settleCreationRace(token, state, written))) {
      await rehydrate()
      tellChanged()
    }
  }

  state.lastSyncedAt = Date.now()
  await storage.putSyncState(state)
  return state
}

/** `manual`: the user asked (a button) - show activity even if it turns
 * out to be a quick check. Background checks stay invisible unless data
 * actually moves. */
async function runOnce(manual: boolean): Promise<void> {
  if (!isGoogleConfigured()) return setPhase('disabled')
  const account = getAccount()
  if (!account) return
  if (!navigator.onLine) return setPhase('offline')
  const token = getAccessToken()
  if (!token) return setPhase('needsAuth')

  lastAttemptAt = Date.now()
  if (manual) setPhase('syncing')
  try {
    const state = await syncWithDrive(token, account.email, () => setPhase('syncing'))
    clearRetry()
    setPhase('idle', {
      error: null,
      problem: null,
      errorDetail: null,
      authFailure: null,
      lastSyncedAt: state.lastSyncedAt ?? null,
      dirty: getLocalMax() > state.syncedUpTo,
    })
    tell({ type: 'synced' })
  } catch (error) {
    console.error('Sync failed', error)
    if (error instanceof drive.DriveAuthError) {
      invalidateToken({ scope: error.scope })
      setPhase('needsAuth')
    } else if (isNetworkError(error)) {
      setPhase('offline')
    } else {
      const { problem, message } = describeFailure(error)
      const errorDetail = error instanceof drive.DriveError ? (error.detail ?? null) : null
      setPhase('error', { error: message, problem, errorDetail })
      // Waiting can't fix these - only the user can (update the app or the
      // browser); retrying would just repeat the same answer.
      if (problem !== 'outdated' && problem !== 'unsupported') scheduleRetry()
    }
  }
}

function describeFailure(error: unknown): { problem: SyncProblem; message: string } {
  if (error instanceof drive.DriveError) return { problem: error.kind, message: error.message }
  if (error instanceof SnapshotFormatError) {
    return { problem: error.problem === 'newer' ? 'outdated' : 'unsupported', message: error.message }
  }
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return { problem: 'unknown', message: 'Bu cihazın depolama alanı dolu, Drive’dan gelen veriler kaydedilemedi.' }
  }
  const detail = error instanceof Error && error.message ? ` (${error.message})` : ''
  return { problem: 'unknown', message: `Eşitleme beklenmedik bir hatayla durdu${detail}. Kendiliğinden tekrar denenecek.` }
}

function scheduleRetry(): void {
  const delay = RETRY_BACKOFF_MS[Math.min(failuresInRow, RETRY_BACKOFF_MS.length - 1)]
  failuresInRow++
  clearTimeout(retryTimer)
  retryTimer = setTimeout(() => void syncNow(), delay)
  useSyncStore.setState({ retryAt: Date.now() + delay })
}

function clearRetry(): void {
  failuresInRow = 0
  clearTimeout(retryTimer)
  useSyncStore.setState({ retryAt: null })
}

/** Background triggers (polling, focus, edits) hold off while a failure's
 * retry delay is running - the scheduled retry covers them. */
function inBackoff(): boolean {
  const retryAt = useSyncStore.getState().retryAt
  return retryAt !== null && Date.now() < retryAt
}

function backgroundSync(): void {
  if (!inBackoff()) void syncNow()
}

/** Runs a sync now, or - if one is already running - once more right after
 * it, so an edit made mid-sync is never left behind. */
export function syncNow(options: { manual?: boolean } = {}): Promise<void> {
  if (running) {
    rerun = true
    rerunManual ||= Boolean(options.manual)
    return running
  }
  let manual = Boolean(options.manual)
  running = (async () => {
    do {
      rerun = false
      await withSyncLock(() => runOnce(manual))
      manual = rerunManual
      rerunManual = false
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
  const offChange = onLocalChange(() => {
    changeCounter++
    tellChanged()
    useSyncStore.setState({ dirty: true })
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(backgroundSync, CHANGE_DEBOUNCE_MS)
  })

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      // Leaving the app (or the phone locking) - push pending edits now
      // rather than when the debounce would have fired.
      if (useSyncStore.getState().dirty) {
        clearTimeout(debounceTimer)
        backgroundSync()
      }
      return
    }
    // Back with an expired token: renew it right away, the same way a
    // fresh page load would, unless that would throw away something on
    // screen (an open dialog, a half-typed note).
    if (shouldRenewSilently() && isSafeToLeavePage()) {
      void writesSettled().then(() => beginSignIn({ silent: true }))
      return
    }
    if (Date.now() - lastAttemptAt > FOCUS_MIN_GAP_MS) backgroundSync()
  }
  const onOnline = () => {
    clearRetry()
    void syncNow()
  }
  const onOffline = () => setPhase('offline')
  // Switching back to this window without the tab ever being hidden
  // (another window on top, side-by-side apps).
  const onFocus = () => {
    if (Date.now() - lastAttemptAt > FOCUS_MIN_GAP_MS) backgroundSync()
  }
  const onTabMessage = (event: MessageEvent<TabMessage>) => {
    const message = event.data
    if (message.type === 'changed') {
      observeStamp(message.stamp)
      void rehydrate()
    } else if (message.type === 'synced') {
      void storage.getSyncState().then((state) =>
        useSyncStore.setState({
          phase: 'idle',
          error: null,
          problem: null,
          errorDetail: null,
          lastSyncedAt: state?.lastSyncedAt ?? null,
          dirty: getLocalMax() > (state?.syncedUpTo ?? 0),
        }),
      )
    } else if (message.type === 'signedOut') {
      window.location.reload()
    }
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  window.addEventListener('focus', onFocus)
  channel?.addEventListener('message', onTabMessage)
  const poll = setInterval(() => {
    if (document.visibilityState === 'visible') backgroundSync()
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
    clearTimeout(retryTimer)
    clearInterval(poll)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    window.removeEventListener('focus', onFocus)
    channel?.removeEventListener('message', onTabMessage)
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
  if (state && normalizeEmail(state.account) !== normalizeEmail(email)) await storage.wipeLocal()
}

/** Signs in again the way the last failure calls for: the account chooser
 * if the wrong account was picked, and the consent screen if Drive turned
 * the account away - a fresh grant is what fixes most refusals (Drive
 * access is also re-asked automatically when it was missing - see
 * beginSignIn). */
export function reconnectGoogle(): void {
  const { authFailure, phase } = useSyncStore.getState()
  beginSignIn({ selectAccount: authFailure?.reason === 'mismatch', forceConsent: phase === 'error' })
}

/**
 * The way out of a sync that seems stuck: forgets which Drive file and
 * version this device last saw, so the next sync downloads the account's
 * copy afresh, merges it record by record, and uploads the result. Nothing
 * is deleted on either side - it's the same merge every sync does, just
 * without trusting any remembered state.
 */
export async function repairSync(): Promise<void> {
  if (running) await running.catch(() => {})
  await withSyncLock(async () => {
    const state = await storage.getSyncState()
    if (state) {
      await storage.putSyncState({ ...state, fileId: undefined, remoteVersion: undefined, syncedUpTo: 0 })
    }
  })
  clearRetry()
  await syncNow({ manual: true })
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
  tell({ type: 'signedOut' })
  window.history.replaceState(null, '', `${window.location.pathname}#${ROUTES.login}`)
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
    tellChanged()
    return
  }
  const token = getAccessToken()
  if (!token || !navigator.onLine) {
    throw new DeleteAllError('Her yerden silmek için internet bağlantısı ve etkin bir Google oturumu gerekiyor.')
  }
  if (running) await running
  // Held for the whole operation: a sync running in another tab right now
  // could otherwise upload the old data again straight after the wipe.
  await withSyncLock(() => wipeEverywhere(token, account.email))
  tellChanged()
  clearRetry()
  setPhase('idle', { dirty: false, error: null, problem: null, errorDetail: null, lastSyncedAt: Date.now() })
}

async function wipeEverywhere(token: string, email: string): Promise<void> {
  const epoch = newEpoch()
  const empty: SyncSnapshot = { app: 'movie-tracker', schema: SNAPSHOT_SCHEMA, epoch, reset: true, writtenAt: Date.now(), tables: {}, media: [] }
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
    account: email,
    fileId: written.id,
    remoteVersion: written.version,
    epoch,
    reset: true,
    syncedUpTo: getLocalMax(),
    lastSyncedAt: Date.now(),
    legacyChecked: true,
  })
  await rehydrate()
}
