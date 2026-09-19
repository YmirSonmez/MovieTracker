import type { ThemePreference } from '@/types/user'

export const THEME_STORAGE_KEY = 'movie-tracker-theme'

// Mirrors --bg in globals.css for each theme - kept in sync manually since
// the meta tag can't read a CSS custom property.
const THEME_COLOR: Record<'dark' | 'light', string> = {
  dark: '#0b0b0d',
  light: '#f7f7f5',
}

function resolveSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(preference: ThemePreference): void {
  const resolved = preference === 'system' ? resolveSystemTheme() : preference
  document.documentElement.setAttribute('data-theme', resolved)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolved])
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Private browsing / storage blocked - theme still applies for this load.
  }
}

/** Keeps the resolved theme correct if the OS theme changes while the user
 * has "System" selected. Returns an unsubscribe function. */
export function watchSystemTheme(getPreference: () => ThemePreference): () => void {
  const media = window.matchMedia('(prefers-color-scheme: light)')
  const listener = () => {
    if (getPreference() === 'system') applyTheme('system')
  }
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}
