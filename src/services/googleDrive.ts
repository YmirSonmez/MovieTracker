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

/** Uploads the current app state as the (single) Drive backup file,
 * creating it on the first backup and overwriting it on every one after. */
export async function backupToDrive(): Promise<{ fileId: string }> {
  const token = await ensureAccessToken()
  const content = JSON.stringify(buildExportBundle(), null, 2)

  let fileId = useCloudSyncStore.getState().meta.driveFileId ?? (await findBackupFileId(token))
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

  await useCloudSyncStore.getState().updateMeta({ driveFileId: fileId, lastSyncedAt: new Date().toISOString() })
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
