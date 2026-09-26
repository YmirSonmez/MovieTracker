/**
 * The handful of Drive REST calls sync needs. The account's data lives in
 * `appDataFolder`: a hidden per-app folder that doesn't show up in the
 * user's Drive and that no other app can read.
 */

const FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'
export const SYNC_FILE_NAME = 'movie-tracker-sync'
const LEGACY_FILE_NAME = 'movie-tracker-backup.json'
const FILE_FIELDS = 'id,version,createdTime'

export interface RemoteFile {
  id: string
  version: string
  createdTime?: string
}

/** The token was rejected - it needs renewing, not retrying. */
export class DriveAuthError extends Error {}
export class DriveError extends Error {}

async function call(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
  if (res.status === 401) throw new DriveAuthError('Google oturumunun süresi doldu.')
  if (res.status === 403) {
    const body = await res.text().catch(() => '')
    if (/insufficient|scope|permission/i.test(body) && !/rate|quota/i.test(body)) {
      throw new DriveAuthError('Google Drive izni eksik.')
    }
    throw new DriveError('Google Drive şu an isteği kabul etmedi, biraz sonra tekrar denenecek.')
  }
  if (!res.ok && res.status !== 404) throw new DriveError(`Google Drive isteği başarısız oldu (${res.status}).`)
  return res
}

/** Normally zero or one. Two devices that both started syncing a brand-new
 * account at the same moment can each create one - oldest first, so every
 * device picks the same one as canonical. */
export async function listSyncFiles(token: string): Promise<RemoteFile[]> {
  const url = new URL(FILES_URL)
  url.searchParams.set('spaces', 'appDataFolder')
  url.searchParams.set('q', `name='${SYNC_FILE_NAME}'`)
  url.searchParams.set('fields', `files(${FILE_FIELDS})`)
  url.searchParams.set('orderBy', 'createdTime')
  url.searchParams.set('pageSize', '10')
  const res = await call(token, url.toString())
  const data = (await res.json()) as { files?: RemoteFile[] }
  // Id breaks a createdTime tie, so every device still picks the same one.
  return (data.files ?? []).sort((a, b) => (a.createdTime ?? '').localeCompare(b.createdTime ?? '') || a.id.localeCompare(b.id))
}

/** Metadata only - how every sync starts, so an unchanged account costs a
 * few hundred bytes instead of a download. Null if the file is gone. */
export async function getFile(token: string, id: string): Promise<RemoteFile | null> {
  const res = await call(token, `${FILES_URL}/${id}?fields=${FILE_FIELDS}`)
  if (res.status === 404) return null
  return (await res.json()) as RemoteFile
}

export async function downloadFile(token: string, id: string): Promise<Uint8Array> {
  const res = await call(token, `${FILES_URL}/${id}?alt=media`)
  if (res.status === 404) throw new DriveError('Drive’daki veri dosyası bulunamadı.')
  return new Uint8Array(await res.arrayBuffer())
}

export async function createSyncFile(token: string, bytes: Uint8Array): Promise<RemoteFile> {
  const boundary = `mt${crypto.randomUUID().replace(/-/g, '')}`
  const metadata = { name: SYNC_FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/octet-stream' }
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
    bytes as BlobPart,
    `\r\n--${boundary}--`,
  ])
  const res = await call(token, `${UPLOAD_URL}?uploadType=multipart&fields=${FILE_FIELDS}`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  return (await res.json()) as RemoteFile
}

export async function updateSyncFile(token: string, id: string, bytes: Uint8Array): Promise<RemoteFile> {
  const res = await call(token, `${UPLOAD_URL}/${id}?uploadType=media&fields=${FILE_FIELDS}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: bytes as BodyInit,
  })
  if (res.status === 404) throw new DriveError('Drive’daki veri dosyası bulunamadı.')
  return (await res.json()) as RemoteFile
}

export async function deleteFile(token: string, id: string): Promise<void> {
  await call(token, `${FILES_URL}/${id}`, { method: 'DELETE' })
}

/** The previous design's backup, in the user's visible Drive. Only
 * reachable with the drive.file scope that design was granted. */
export async function findLegacyBackup(token: string): Promise<RemoteFile | null> {
  const url = new URL(FILES_URL)
  url.searchParams.set('spaces', 'drive')
  url.searchParams.set('q', `name='${LEGACY_FILE_NAME}' and trashed=false`)
  url.searchParams.set('fields', `files(${FILE_FIELDS})`)
  url.searchParams.set('orderBy', 'modifiedTime desc')
  url.searchParams.set('pageSize', '1')
  const res = await call(token, url.toString())
  const data = (await res.json()) as { files?: RemoteFile[] }
  return data.files?.[0] ?? null
}
