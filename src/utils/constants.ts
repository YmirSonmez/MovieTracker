/** App-wide layering scale. Add a name here instead of an ad hoc z-* value. */
export const Z_INDEX = {
  stickyNav: 40,
  dropdown: 50,
  mobileBottomNav: 40,
  modalOverlay: 100,
  modal: 101,
  commandPalette: 110,
  toast: 120,
} as const

export const APP_NAME = 'Movie Tracker'

/** Bumped whenever the export/import JSON schema changes shape.
 * v2 added `apiConfig` (the user's personal TMDB key, if set). */
export const EXPORT_SCHEMA_VERSION = 2

export const STORAGE_DB_NAME = 'movie-tracker'
export const STORAGE_DB_VERSION = 1

/** Local-only hint so Settings can label "demo data is loaded" - not a
 * source of truth for what data exists, just a label. */
export const DEMO_DATA_FLAG_KEY = 'movie-tracker-demo-loaded'

/** Caches the short-lived Google Drive access token (and the email it
 * belongs to) across page reloads/tab closes, so re-visiting within its
 * ~1 hour lifetime doesn't force reconnecting. Never contains a refresh
 * token - the token this holds still expires exactly as fast either way. */
export const DRIVE_TOKEN_STORAGE_KEY = 'movie-tracker-drive-token'
