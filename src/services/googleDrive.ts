import { useCloudSyncStore } from '@/store/cloudSyncStore'
import { buildExportBundle, buildImportPreview, parseImportBundle } from '@/utils/exportImport'
import { DRIVE_TOKEN_STORAGE_KEY } from '@/utils/constants'
import type { ImportPreview, MovieTrackerExport } from '@/types/export'

/**
 * Personal cloud backup via the visitor's own Google Drive - not a shared
 * backend. Everything here runs client-side (Google Identity Services'
 * implicit token flow), which is the only OAuth flow that works from a
 * static site with no server to hold a client secret. Getting a refresh
 * token (real, indefinite persistence) instead would need a server to hold
 * a client secret - out of scope for a GitHub Pages-only deployment, so the
 * access token this grants still expires in about an hour no matter what.
 * What we *can* do without a backend: cache it in localStorage so revisiting
 * within that hour (including after fully closing the tab) doesn't force
 * reconnecting. Never written to IndexedDB or the export bundle, and never
 * anything but this short-lived, `drive.file`-scoped token - the app can
 * only ever see files it created itself, never the rest of the user's Drive.
 */

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email'
const BACKUP_FILE_NAME = 'movie-tracker-backup.json'
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  error?: string
  error_description?: string
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: GoogleTokenResponse) => void
            error_callback?: (error: { type: string; message?: string }) => void
          }) => GoogleTokenClient
          revoke: (token: string, callback?: () => void) => void
        }
      }
    }
  }
}

export class GoogleDriveError extends Error {}

export function isGoogleDriveConfigured(): boolean {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  return Boolean(clientId && clientId.trim().length > 0)
}

let scriptLoadPromise: Promise<void> | null = null
let accessToken: string | null = null
let tokenExpiresAt = 0

interface StoredDriveToken {
  accessToken: string
  expiresAt: number
  email: string | null
}

function persistToken(): void {
  try {
    if (!accessToken) {
      localStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY)
      return
    }
    const stored: StoredDriveToken = {
      accessToken,
      expiresAt: tokenExpiresAt,
      email: useCloudSyncStore.getState().connectedEmail,
    }
    localStorage.setItem(DRIVE_TOKEN_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Private browsing / storage blocked - just means a reload loses the
    // session like before, no worse than not having this at all.
  }
}

/** Reads back a still-valid cached token, if any - called once at boot. */
function restorePersistedToken(): void {
  try {
    const raw = localStorage.getItem(DRIVE_TOKEN_STORAGE_KEY)
    if (!raw) return
    const stored = JSON.parse(raw) as Partial<StoredDriveToken>
    if (typeof stored.accessToken !== 'string' || typeof stored.expiresAt !== 'number') {
      localStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY)
      return
    }
    if (Date.now() >= stored.expiresAt - 60_000) {
      localStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY)
      return
    }
    accessToken = stored.accessToken
    tokenExpiresAt = stored.expiresAt
    useCloudSyncStore.getState().setConnectedEmail(stored.email ?? null)
  } catch {
    // Corrupted entry - behave as if nothing was cached.
    try {
      localStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY)
    } catch {
      // Storage itself is inaccessible - nothing more to do.
    }
  }
}

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      // A transient network blip shouldn't permanently break Drive features
      // for the rest of the session - let the next call retry from scratch.
      scriptLoadPromise = null
      reject(new GoogleDriveError('Google giriş betiği yüklenemedi. İnternet bağlantını kontrol et.'))
    }
    document.head.appendChild(script)
  })
  return scriptLoadPromise
}

/**
 * Fetching the GIS script takes a real network round-trip. Doing that for
 * the first time inside a click handler (ensureAccessToken -> loadGisScript)
 * delays the popup past the tap that was supposed to authorize it, and
 * mobile browsers then treat it as script-initiated rather than user-
 * initiated and kill it - surfacing as a bare "popup window closed" with no
 * other explanation. Called once at app boot so the script is already
 * loaded (or failed and retryable) long before anyone taps a Drive button.
 * Also restores a still-valid cached token, so revisiting within its
 * lifetime doesn't show the connect banner or ask to reconnect at all.
 */
export function preloadGoogleIdentity(): void {
  if (!isGoogleDriveConfigured()) return
  restorePersistedToken()
  void loadGisScript().catch(() => {
    // Ignored here - a real click later goes through ensureAccessToken()
    // again and surfaces the same error to the user properly.
  })
}

/** GIS reports popup problems via a bare `{ type, message }` - `message` is
 * often missing or, when present, raw English GIS internals (e.g. "Popup
 * window closed"). Translate the type into something a visitor can actually
 * act on instead of surfacing that string verbatim. */
function mapTokenErrorToMessage(error: { type: string; message?: string }): string {
  switch (error.type) {
    case 'popup_closed':
      return 'Google giriş penceresi açılır açılmaz kapandı. Lütfen tekrar dene.'
    case 'popup_failed_to_open':
      return 'Google giriş penceresi açılamadı. Tarayıcının popup engelleyicisini kontrol edip tekrar dene.'
    default:
      return error.message ?? 'Google girişi iptal edildi.'
  }
}

function requestAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      reject(new GoogleDriveError('Google bağlantısı bu dağıtımda yapılandırılmamış.'))
      return
    }
    const google = window.google
    if (!google) {
      reject(new GoogleDriveError('Google girişi hazır değil, tekrar dene.'))
      return
    }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new GoogleDriveError(response.error_description ?? 'Google girişi tamamlanamadı.'))
          return
        }
        accessToken = response.access_token
        tokenExpiresAt = Date.now() + response.expires_in * 1000
        resolve(response.access_token)
      },
      error_callback: (error) => {
        reject(new GoogleDriveError(mapTokenErrorToMessage(error)))
      },
    })
    client.requestAccessToken()
  })
}

async function fetchUserEmail(token: string): Promise<string | null> {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  const data = (await res.json()) as { email?: string }
  return data.email ?? null
}

async function ensureAccessToken(): Promise<string> {
  await loadGisScript()
  if (accessToken && Date.now() < tokenExpiresAt - 60_000) {
    return accessToken
  }
  const token = await requestAccessToken()
  const email = await fetchUserEmail(token).catch(() => null)
  useCloudSyncStore.getState().setConnectedEmail(email)
  persistToken()
  return token
}

/** Explicitly triggers the Google consent flow - used by a "Bağlan" button
 * so the user gets immediate feedback before trying to back up or restore. */
export async function connectGoogleDrive(): Promise<{ email: string | null }> {
  await ensureAccessToken()
  return { email: useCloudSyncStore.getState().connectedEmail }
}

/** Whether a live, unexpired token is already held in memory - lets a
 * caller (autoSync) skip a doomed silent reconnect attempt instead of
 * triggering a popup that the browser will block outside a click handler. */
export function hasValidDriveToken(): boolean {
  return Boolean(accessToken) && Date.now() < tokenExpiresAt - 60_000
}

export function disconnectGoogleDrive(): void {
  if (accessToken && window.google) {
    window.google.accounts.oauth2.revoke(accessToken, () => {})
  }
  accessToken = null
  tokenExpiresAt = 0
  useCloudSyncStore.getState().setConnectedEmail(null)
  persistToken()
}

async function findBackupFileId(token: string): Promise<string | undefined> {
  const url = new URL(DRIVE_FILES_URL)
  url.searchParams.set('q', `name='${BACKUP_FILE_NAME}' and trashed=false`)
  url.searchParams.set('spaces', 'drive')
  url.searchParams.set('fields', 'files(id,modifiedTime)')
  url.searchParams.set('pageSize', '1')
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new GoogleDriveError('Drive dosyaları listelenemedi.')
  const data = (await res.json()) as { files?: Array<{ id: string }> }
  return data.files?.[0]?.id
}

interface RemoteDataVersion {
  deviceId: string
  updatedAt: string
}

function multipartBody(boundary: string, metadata: object, content: string): string {
  return (
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`
  )
}

/** Drive's `properties` are small custom key/value strings attached to a
 * file, readable via a metadata-only request (no content download). Stamping
 * the writer's dataVersion there lets a later write cheaply notice "someone
 * else changed this since I last looked" without fetching the whole file. */
function dataVersionProperties(dataVersion: RemoteDataVersion): Record<string, string> {
  return { deviceId: dataVersion.deviceId, updatedAt: dataVersion.updatedAt }
}

async function createBackupFile(token: string, content: string, dataVersion: RemoteDataVersion): Promise<string> {
  const boundary = 'movietrackerbackup'
  const metadata = { name: BACKUP_FILE_NAME, mimeType: 'application/json', properties: dataVersionProperties(dataVersion) }
  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipartBody(boundary, metadata, content),
  })
  if (!res.ok) throw new GoogleDriveError('Drive dosyası oluşturulamadı.')
  const data = (await res.json()) as { id: string }
  return data.id
}

/** Multipart (not plain media) so the same request updates the file's
 * `properties` alongside its content - a media-only PATCH would silently
 * leave the previous writer's dataVersion in place. */
async function updateBackupFile(token: string, fileId: string, content: string, dataVersion: RemoteDataVersion): Promise<void> {
  const boundary = 'movietrackerbackup'
  const metadata = { properties: dataVersionProperties(dataVersion) }
  const res = await fetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=multipart`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipartBody(boundary, metadata, content),
  })
  if (!res.ok) throw new GoogleDriveError('Drive dosyası güncellenemedi.')
}

/** Metadata-only - no content transfer - so backupToDrive() can cheaply
 * notice the file moved under it before blindly overwriting it. Returns
 * null for a file with no properties (created before this existed, or the
 * request itself failing) - callers must treat that as "unknown", not as
 * "nothing has changed". */
async function getRemoteDataVersion(token: string, fileId: string): Promise<RemoteDataVersion | null> {
  try {
    const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?fields=properties`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const data = (await res.json()) as { properties?: Record<string, string> }
    const deviceId = data.properties?.deviceId
    const updatedAt = data.properties?.updatedAt
    if (!deviceId || !updatedAt) return null
    return { deviceId, updatedAt }
  } catch {
    return null
  }
}

async function downloadBackupFile(token: string, fileId: string): Promise<string> {
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new GoogleDriveError('Drive dosyası indirilemedi.')
  return res.text()
}

export type BackupResult =
  | { fileId: string }
  | { conflict: true; fileId: string }
  | { suspiciousDrop: true; fileId: string; previousCount: number; nextCount: number }
  | { remoteChanged: true; fileId: string }

/** A library that shrinks by this much since the last successful upload is
 * treated as data loss rather than the user just tidying up their list. */
const SUSPICIOUS_DROP_MIN_PREVIOUS = 3
const SUSPICIOUS_DROP_RATIO = 0.2

function isSuspiciousDrop(previousCount: number, nextCount: number): boolean {
  if (previousCount < SUSPICIOUS_DROP_MIN_PREVIOUS) return false
  if (nextCount === 0) return true
  return nextCount / previousCount < SUSPICIOUS_DROP_RATIO
}

/**
 * Uploads the current app state as the (single) Drive backup file,
 * creating it on the first backup and overwriting it on every one after -
 * but ONLY once this device has an established, reconciled relationship
 * with that file (`meta.driveFileId`). The first time a device connects,
 * with no `driveFileId` of its own yet, it checks Drive before writing
 * anything: if a backup already exists there (the same Google account,
 * connected from another device, with data this device has never seen),
 * it is never silently overwritten with this device's local state - that
 * would destroy it. Callers get `{ conflict: true }` instead and must
 * point the user at restoreFromDrive() (merge or replace) to reconcile
 * first; only after that succeeds does `driveFileId` get set, and normal
 * backups resume.
 *
 * The same danger exists the other way round, after that relationship is
 * established: if THIS device's local library suddenly collapses (a
 * storage eviction, a bug, an accidental "sil" click) auto-sync would
 * otherwise dutifully upload that emptiness a few seconds later and
 * permanently erase the one good backup on Drive. So every write against
 * an existing file first compares the new library size to the last
 * successfully synced one; a suspicious collapse returns
 * `{ suspiciousDrop: true }` instead of writing, unless the caller passes
 * `force: true` (an explicit, user-acknowledged "back up anyway").
 *
 * A third danger only shows up with more than one device: between this
 * device's last successful sync and now, another device could have pushed
 * its own newer changes to the same file. Overwriting that blindly would
 * silently erase work this device never saw. So every write against an
 * existing file also does one cheap, content-free metadata check first -
 * has the file's stamped dataVersion moved since we last saw it, and does
 * it belong to a different device? If so, `{ remoteChanged: true }` instead
 * of writing; the caller reviews the remote version (same flow as
 * `conflict`) before anything is decided.
 */
export async function backupToDrive(options?: { force?: boolean }): Promise<BackupResult> {
  const token = await ensureAccessToken()
  const { meta } = useCloudSyncStore.getState()
  let fileId = meta.driveFileId

  if (!fileId) {
    const existingId = await findBackupFileId(token)
    if (existingId) {
      return { conflict: true, fileId: existingId }
    }
  }

  const bundle = buildExportBundle()
  const nextCount = bundle.libraryEntries.length

  if (fileId && !options?.force) {
    const previousCount = meta.lastSyncedLibraryCount ?? 0
    if (isSuspiciousDrop(previousCount, nextCount)) {
      return { suspiciousDrop: true, fileId, previousCount, nextCount }
    }

    const remoteVersion = await getRemoteDataVersion(token, fileId)
    if (
      remoteVersion &&
      remoteVersion.deviceId !== bundle.dataVersion.deviceId &&
      remoteVersion.updatedAt !== meta.lastKnownRemoteUpdatedAt
    ) {
      return { remoteChanged: true, fileId }
    }
  }

  const content = JSON.stringify(bundle, null, 2)
  if (fileId) {
    try {
      await updateBackupFile(token, fileId, content, bundle.dataVersion)
    } catch {
      // Stale pointer (file removed/moved outside the app) - fall back to a fresh one.
      fileId = await createBackupFile(token, content, bundle.dataVersion)
    }
  } else {
    fileId = await createBackupFile(token, content, bundle.dataVersion)
  }

  await useCloudSyncStore.getState().updateMeta({
    driveFileId: fileId,
    lastSyncedAt: new Date().toISOString(),
    lastSyncedLibraryCount: nextCount,
    lastKnownRemoteDeviceId: bundle.dataVersion.deviceId,
    lastKnownRemoteUpdatedAt: bundle.dataVersion.updatedAt,
  })
  return { fileId }
}

/** Downloads and parses the Drive backup file. Applying it to local storage
 * is left to the caller, via the same applyImport() flow local file restore
 * uses, so both paths share one merge/replace confirmation UI. Recording
 * the downloaded dataVersion as this device's new "last known remote" is
 * safe regardless of whether the caller actually applies it - it reflects
 * what's really on Drive right now either way. */
export async function restoreFromDrive(): Promise<{ bundle: MovieTrackerExport; preview: ImportPreview }> {
  const token = await ensureAccessToken()
  const fileId = useCloudSyncStore.getState().meta.driveFileId ?? (await findBackupFileId(token))
  if (!fileId) throw new GoogleDriveError('Google Drive hesabında bir Movie Tracker yedeği bulunamadı.')

  const content = await downloadBackupFile(token, fileId)
  const bundle = parseImportBundle(content)
  await useCloudSyncStore.getState().updateMeta({
    driveFileId: fileId,
    lastKnownRemoteDeviceId: bundle.dataVersion.deviceId,
    lastKnownRemoteUpdatedAt: bundle.dataVersion.updatedAt,
  })
  return { bundle, preview: buildImportPreview(bundle) }
}

export interface DriveBackupRevision {
  id: string
  modifiedTime: string
  sizeBytes?: number
}

/**
 * Every overwrite of the backup file also lands in Drive's own revision
 * history, kept automatically without any extra API calls from this app.
 * That history is a safety net independent of everything above: even if a
 * bad state slipped past the shrink guard (or was written with `force`),
 * an earlier good version is still sitting on Drive and recoverable here.
 * Newest first.
 */
export async function listBackupRevisions(): Promise<DriveBackupRevision[]> {
  const token = await ensureAccessToken()
  const fileId = useCloudSyncStore.getState().meta.driveFileId ?? (await findBackupFileId(token))
  if (!fileId) throw new GoogleDriveError('Google Drive hesabında bir Movie Tracker yedeği bulunamadı.')

  const url = new URL(`${DRIVE_FILES_URL}/${fileId}/revisions`)
  url.searchParams.set('fields', 'revisions(id,modifiedTime,size)')
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new GoogleDriveError('Yedek geçmişi alınamadı.')
  const data = (await res.json()) as { revisions?: Array<{ id: string; modifiedTime: string; size?: string }> }
  const revisions = data.revisions ?? []
  return revisions
    .map((r) => ({ id: r.id, modifiedTime: r.modifiedTime, sizeBytes: r.size ? Number(r.size) : undefined }))
    .sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime))
}

/** Downloads and parses one specific past revision of the backup file,
 * for the "yedek geçmişi" restore flow - shares the same merge/replace
 * preview UI as restoreFromDrive() and local file restore. */
export async function restoreFromDriveRevision(revisionId: string): Promise<{ bundle: MovieTrackerExport; preview: ImportPreview }> {
  const token = await ensureAccessToken()
  const fileId = useCloudSyncStore.getState().meta.driveFileId ?? (await findBackupFileId(token))
  if (!fileId) throw new GoogleDriveError('Google Drive hesabında bir Movie Tracker yedeği bulunamadı.')

  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}/revisions/${revisionId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new GoogleDriveError('Bu yedek sürümü indirilemedi.')
  const bundle = parseImportBundle(await res.text())
  return { bundle, preview: buildImportPreview(bundle) }
}
