/**
 * Google sign-in for a static site with no backend: OAuth 2.0's implicit
 * flow, as a full-page redirect (no popup, no Google script to load).
 *
 * Two things are kept apart on purpose:
 * - the *account link* (which Google account this device belongs to) is
 *   permanent until the user signs out - it is what decides whether the
 *   app shows the sign-in screen at all;
 * - the *access token* lasts about an hour and only matters for syncing.
 *   When it runs out, the app keeps working from local data and renews it
 *   with a silent `prompt=none` redirect: Google sends the browser straight
 *   back with a fresh token, no screen, no click - as long as the user is
 *   still signed in to Google in this browser.
 *
 * A refresh token would avoid even that redirect, but can only be held by
 * a server (it needs a client secret); this app deliberately has none.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKENINFO_ENDPOINT = 'https://oauth2.googleapis.com/tokeninfo'

const SCOPE_EMAIL = 'https://www.googleapis.com/auth/userinfo.email'
export const SCOPE_APPDATA = 'https://www.googleapis.com/auth/drive.appdata'
/** Not requested - only ever present because an earlier version of the app
 * asked for it (include_granted_scopes carries it over). Lets the sync
 * engine pick up that version's `movie-tracker-backup.json` once. */
export const SCOPE_FILE = 'https://www.googleapis.com/auth/drive.file'

const ACCOUNT_KEY = 'movie-tracker-account'
const TOKEN_KEY = 'movie-tracker-token'
const PENDING_KEY = 'movie-tracker-auth-pending'
const SILENT_ATTEMPT_KEY = 'movie-tracker-auth-silent-at'
/** Leftovers from the previous design - removed on sight. */
const LEGACY_KEYS = ['movie-tracker-drive-token', 'movie-tracker-device-id', 'movie-tracker-demo-loaded']

/** Renew this long before Google's stated expiry, so a sync that starts
 * with a "valid" token doesn't have it die halfway through. */
const EXPIRY_MARGIN_MS = 2 * 60_000
/** A silent renewal that bounced back without a token (signed out of
 * Google, consent revoked) isn't retried automatically for this long -
 * otherwise every page load would redirect in a loop. */
const SILENT_RETRY_AFTER_MS = 10 * 60_000
const PENDING_TTL_MS = 10 * 60_000

export interface Account {
  email: string
}

interface StoredToken {
  accessToken: string
  expiresAt: number
  scopes: string[]
}

interface PendingSignIn {
  state: string
  returnTo: string
  silent: boolean
  at: number
}

export type AuthFailureReason = 'denied' | 'interaction' | 'scope' | 'mismatch' | 'network' | 'invalid'

export type AuthRedirectResult =
  | { kind: 'none' }
  | { kind: 'signedIn'; email: string }
  | { kind: 'renewed'; email: string }
  | { kind: 'failed'; silent: boolean; reason: AuthFailureReason; message: string }

function clientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
}

export function isGoogleConfigured(): boolean {
  return clientId().length > 0
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage blocked (private mode on some browsers) - the session just
    // won't survive a reload, same as having no storage at all.
  }
}

export function getAccount(): Account | null {
  const account = read<Account>(ACCOUNT_KEY)
  return account && typeof account.email === 'string' ? account : null
}

function getStoredToken(): StoredToken | null {
  const token = read<StoredToken>(TOKEN_KEY)
  if (!token || typeof token.accessToken !== 'string' || typeof token.expiresAt !== 'number') return null
  return token
}

/** A token that's good for at least a couple more minutes, or null. */
export function getAccessToken(): string | null {
  const token = getStoredToken()
  if (!token || Date.now() >= token.expiresAt - EXPIRY_MARGIN_MS) return null
  return token.accessToken
}

export function getTokenExpiry(): number | null {
  return getStoredToken()?.expiresAt ?? null
}

export function hasScope(scope: string): boolean {
  return getStoredToken()?.scopes.includes(scope) ?? false
}

/** Drive said the token is no good (revoked, or expired early). */
export function invalidateToken(): void {
  write(TOKEN_KEY, null)
}

/** The exact redirect URI registered in Google Cloud Console - the app's
 * root, e.g. https://ymirsonmez.github.io/MovieTracker/ */
function redirectUri(): string {
  return `${window.location.origin}${window.location.pathname.replace(/index\.html$/, '')}`
}

/** The in-app route (HashRouter path) to come back to after the redirect. */
export function currentRoute(): string {
  const hash = window.location.hash.slice(1)
  return hash.startsWith('/') ? hash : '/'
}

/**
 * Leaves the page for Google's sign-in. `silent` never shows anything:
 * Google either redirects straight back with a token or with an error.
 */
export function beginSignIn(options: { silent?: boolean; returnTo?: string; forceConsent?: boolean } = {}): void {
  const state = crypto.randomUUID()
  const pending: PendingSignIn = { state, returnTo: options.returnTo ?? currentRoute(), silent: Boolean(options.silent), at: Date.now() }
  write(PENDING_KEY, pending)
  if (options.silent) write(SILENT_ATTEMPT_KEY, Date.now())

  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: [SCOPE_EMAIL, SCOPE_APPDATA].join(' '),
    include_granted_scopes: 'true',
    state,
  })
  const account = getAccount()
  if (account) params.set('login_hint', account.email)
  if (options.silent) params.set('prompt', 'none')
  else if (options.forceConsent) params.set('prompt', 'consent')
  else if (!account) params.set('prompt', 'select_account')
  window.location.assign(`${AUTH_ENDPOINT}?${params.toString()}`)
}

/** Whether boot should bounce through Google for a fresh token before
 * rendering: the device is linked, the token is gone, we're online, and we
 * haven't just tried and failed. */
export function shouldRenewSilently(): boolean {
  if (!isGoogleConfigured() || !getAccount() || getAccessToken()) return false
  if (!navigator.onLine) return false
  const lastAttempt = read<number>(SILENT_ATTEMPT_KEY) ?? 0
  return Date.now() - lastAttempt > SILENT_RETRY_AFTER_MS
}

const SILENT_FAILURES = new Set(['interaction_required', 'login_required', 'consent_required', 'account_selection_required'])

function failed(silent: boolean, reason: AuthFailureReason, message: string): AuthRedirectResult {
  return { kind: 'failed', silent, reason, message }
}

/**
 * Consumes Google's answer (`#access_token=...` or `#error=...`) if this
 * page load is one. Must run before the router renders - to HashRouter
 * that fragment would look like a route. Replaces the URL with the route
 * the user started from, so the token never lingers in history.
 */
export async function consumeAuthRedirect(): Promise<AuthRedirectResult> {
  for (const key of LEGACY_KEYS) write(key, null)

  const fragment = window.location.hash.slice(1)
  if (!/(^|&)(access_token|error)=/.test(fragment)) return { kind: 'none' }

  const params = new URLSearchParams(fragment)
  const pending = read<PendingSignIn>(PENDING_KEY)
  write(PENDING_KEY, null)
  const returnTo = pending && Date.now() - pending.at < PENDING_TTL_MS ? pending.returnTo : '/'
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${returnTo}`)

  const silent = pending?.silent ?? false
  if (!pending || params.get('state') !== pending.state) {
    return failed(silent, 'invalid', 'Giriş yanıtı doğrulanamadı. Lütfen tekrar dene.')
  }

  const error = params.get('error')
  if (error) {
    if (SILENT_FAILURES.has(error)) {
      return failed(silent, 'interaction', 'Google oturumunun yenilenmesi gerekiyor.')
    }
    if (error === 'access_denied') return failed(silent, 'denied', 'Giriş iptal edildi.')
    return failed(silent, 'invalid', 'Google girişi tamamlanamadı. Lütfen tekrar dene.')
  }

  const accessToken = params.get('access_token')
  if (!accessToken) return failed(silent, 'invalid', 'Google girişi tamamlanamadı. Lütfen tekrar dene.')

  // Confirms the token was issued to *this* app (not one pasted in from
  // another client) and tells us the account and the scopes actually
  // granted - the consent screen lets people untick Drive access.
  let info: { aud?: string; email?: string; scope?: string; expires_in?: string }
  try {
    const res = await fetch(`${TOKENINFO_ENDPOINT}?access_token=${encodeURIComponent(accessToken)}`)
    if (!res.ok) return failed(silent, 'invalid', 'Google girişi doğrulanamadı. Lütfen tekrar dene.')
    info = (await res.json()) as typeof info
  } catch {
    return failed(silent, 'network', 'Google’a ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.')
  }
  if (info.aud !== clientId() || !info.email) {
    return failed(silent, 'invalid', 'Google girişi doğrulanamadı. Lütfen tekrar dene.')
  }
  const scopes = (info.scope ?? '').split(' ').filter(Boolean)
  if (!scopes.includes(SCOPE_APPDATA)) {
    return failed(silent, 'scope', 'Verilerini Drive’da tutabilmek için izin ekranındaki Google Drive kutusunu işaretlemen gerekiyor.')
  }

  const account = getAccount()
  if (account && account.email !== info.email) {
    return failed(
      silent,
      'mismatch',
      `Bu cihaz ${account.email} hesabına bağlı. Başka bir hesap kullanmak için önce Ayarlar’dan çıkış yap.`,
    )
  }

  const expiresIn = Number(info.expires_in ?? params.get('expires_in') ?? 3600)
  write(TOKEN_KEY, { accessToken, expiresAt: Date.now() + expiresIn * 1000, scopes } satisfies StoredToken)
  write(SILENT_ATTEMPT_KEY, null)
  if (account) return { kind: 'renewed', email: info.email }
  write(ACCOUNT_KEY, { email: info.email } satisfies Account)
  return { kind: 'signedIn', email: info.email }
}

/** Forgets the account on this device. Deliberately does not revoke the
 * grant at Google: that would sign every *other* device out too. */
export function forgetAccount(): void {
  write(TOKEN_KEY, null)
  write(ACCOUNT_KEY, null)
  write(PENDING_KEY, null)
  write(SILENT_ATTEMPT_KEY, null)
}
