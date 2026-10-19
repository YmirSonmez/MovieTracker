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

/** The token was rejected - it needs renewing, not retrying. `scope`: it
 * is valid but lacks Drive access, so a plain renewal would just hand back
 * the same grant - the consent screen has to be shown again. */
export class DriveAuthError extends Error {
  constructor(
    message: string,
    readonly scope = false,
  ) {
    super(message)
  }
}

/**
 * - storageFull: the account's Drive is out of space (appDataFolder counts
 *   toward the quota) - nothing the app can do until the user frees some.
 * - apiDisabled: the app's Google Cloud project has Drive switched off.
 * - forbidden: Drive refused this account for a reason not recognised
 *   below - a fresh sign-in is the likeliest fix, so the UI leads with it.
 * - transient: rate limits, Google-side errors - retrying later works.
 */
export type DriveErrorKind = 'storageFull' | 'apiDisabled' | 'forbidden' | 'transient'

export class DriveError extends Error {
  constructor(
    message: string,
    readonly kind: DriveErrorKind = 'transient',
    /** Google's own status, reason codes and message - shown as a small
     * technical line so an unrecognised failure can still be diagnosed. */
    readonly detail?: string,
  ) {
    super(message)
  }
}

/** Google's error body carries a machine-readable reason
 * (`error.errors[].reason`, `error.status`, `error.details[].reason`) - the
 * HTTP status alone can't tell "Drive is full" from "slow down". */
async function failureFor(res: Response): Promise<Error> {
  const text = await res.text().catch(() => '')
  let reasons = ''
  let googleMessage = ''
  try {
    const body = JSON.parse(text) as {
      error?: { message?: string; status?: string; errors?: Array<{ reason?: string }>; details?: Array<{ reason?: string }> }
    }
    reasons = [body.error?.status, ...(body.error?.errors ?? []).map((e) => e.reason), ...(body.error?.details ?? []).map((d) => d.reason)]
      .filter(Boolean)
      .join(' ')
    googleMessage = body.error?.message ?? ''
  } catch {
    // Not JSON (a proxy's HTML page) - fall back to the raw text below.
  }
  const haystack = `${reasons} ${text}`
  const detail = [`HTTP ${res.status}`, reasons, googleMessage].filter(Boolean).join(' · ').slice(0, 300)

  if (res.status === 401) return new DriveAuthError('Google oturumunun süresi doldu.')
  if (/storageQuotaExceeded/i.test(haystack)) {
    return new DriveError('Google Drive depolama alanın dolu. Biraz yer açtığında eşitleme kendiliğinden devam eder.', 'storageFull', detail)
  }
  if (/accessNotConfigured|SERVICE_DISABLED/i.test(haystack)) {
    return new DriveError('Uygulamanın Google Drive erişimi şu an kapalı. Uygulama yöneticisinin Drive API’yi açması gerekiyor.', 'apiDisabled', detail)
  }
  if (res.status === 429 || /rateLimitExceeded|RESOURCE_EXHAUSTED/i.test(haystack)) {
    return new DriveError('Google Drive şu an çok yoğun, biraz sonra kendiliğinden tekrar denenecek.', 'transient', detail)
  }
  if (res.status === 403 && /insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient.*scope/i.test(haystack)) {
    return new DriveAuthError('Google Drive izni eksik.', true)
  }
  if (res.status >= 500) {
    return new DriveError('Google Drive geçici bir sorun yaşıyor, biraz sonra kendiliğinden tekrar denenecek.', 'transient', detail)
  }
  if (res.status === 403) {
    return new DriveError('Google Drive bu hesabın erişimini reddetti. Google ile yeniden bağlanmak genellikle düzeltir.', 'forbidden', detail)
  }
  return new DriveError(`Google Drive isteği kabul etmedi (${res.status}). Biraz sonra kendiliğinden tekrar denenecek.`, 'transient', detail)
}

async function call(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
  if (!res.ok && res.status !== 404) throw await failureFor(res)
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

/** Moves a file out of the way without destroying it: a sync file this
 * version can't read is renamed, so a fresh one can take its name while the
 * original stays recoverable. */
export async function renameFile(token: string, id: string, name: string): Promise<void> {
  await call(token, `${FILES_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ name }),
  })
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
