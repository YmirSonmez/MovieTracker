import { useCloudSyncStore } from '@/store/cloudSyncStore'
import { buildExportBundle, buildImportPreview, parseImportBundle } from '@/utils/exportImport'
import type { ImportPreview, MovieTrackerExport } from '@/types/export'

/**
 * Personal cloud backup via the visitor's own Google Drive - not a shared
 * backend. Everything here runs client-side (Google Identity Services'
 * implicit token flow), which is the only OAuth flow that works from a
 * static site with no server to hold a client secret. The access token it
 * grants lives in memory only (this module-level variable) for the current
 * tab/session; nothing about it is ever written to IndexedDB or the export
 * bundle. Scope is `drive.file`, so the app can only see files it created
 * itself - never the rest of the user's Drive.
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

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new GoogleDriveError('Google giriş betiği yüklenemedi. İnternet bağlantını kontrol et.'))
    document.head.appendChild(script)
  })
  return scriptLoadPromise
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
        reject(new GoogleDriveError(error.message ?? 'Google girişi iptal edildi.'))
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

async function createBackupFile(token: string, content: string): Promise<string> {
  const boundary = 'movietrackerbackup'
  const metadata = { name: BACKUP_FILE_NAME, mimeType: 'application/json' }
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`
  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  if (!res.ok) throw new GoogleDriveError('Drive dosyası oluşturulamadı.')
  const data = (await res.json()) as { id: string }
  return data.id
}

async function updateBackupFile(token: string, fileId: string, content: string): Promise<void> {
  const res = await fetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: content,
  })
  if (!res.ok) throw new GoogleDriveError('Drive dosyası güncellenemedi.')
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
  }

  const content = JSON.stringify(bundle, null, 2)
  if (fileId) {
    try {
      await updateBackupFile(token, fileId, content)
    } catch {
      // Stale pointer (file removed/moved outside the app) - fall back to a fresh one.
      fileId = await createBackupFile(token, content)
    }
  } else {
    fileId = await createBackupFile(token, content)
  }

  await useCloudSyncStore
    .getState()
    .updateMeta({ driveFileId: fileId, lastSyncedAt: new Date().toISOString(), lastSyncedLibraryCount: nextCount })
  return { fileId }
}

/** Downloads and parses the Drive backup file. Applying it to local storage
 * is left to the caller, via the same applyImport() flow local file restore
 * uses, so both paths share one merge/replace confirmation UI. */
export async function restoreFromDrive(): Promise<{ bundle: MovieTrackerExport; preview: ImportPreview }> {
  const token = await ensureAccessToken()
  const fileId = useCloudSyncStore.getState().meta.driveFileId ?? (await findBackupFileId(token))
  if (!fileId) throw new GoogleDriveError('Google Drive hesabında bir Movie Tracker yedeği bulunamadı.')

  const content = await downloadBackupFile(token, fileId)
  const bundle = parseImportBundle(content)
  await useCloudSyncStore.getState().updateMeta({ driveFileId: fileId })
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
