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
 * v2 added `apiConfig` (the user's personal TMDB key, if set).
 * v3 added `dataVersion` for the previous Drive sync design.
 * v4 dropped it again - sync no longer goes through export files. */
export const EXPORT_SCHEMA_VERSION = 4

export const STORAGE_DB_NAME = 'movie-tracker'
export const STORAGE_DB_VERSION = 2
