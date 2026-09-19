const KEY = 'movie-tracker-recent-searches'
const MAX_ITEMS = 8

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function addRecentSearch(term: string): string[] {
  const trimmed = term.trim()
  if (!trimmed) return getRecentSearches()
  const next = [trimmed, ...getRecentSearches().filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_ITEMS)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore storage failures
  }
  return next
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
