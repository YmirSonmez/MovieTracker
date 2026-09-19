import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/utils/routes'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

const DIRECT_NAV_KEYS: Record<string, string> = {
  w: ROUTES.watchlist,
  l: ROUTES.library,
  d: ROUTES.discover,
  s: ROUTES.statistics,
}

/** App-wide keyboard shortcuts (spec section 35/34): Cmd/Ctrl+K and "/" open
 * the command palette, single-letter shortcuts jump to a section - all
 * disabled while the user is typing anywhere, so they never eat real input. */
export function useGlobalShortcuts(openCommandPalette: () => void) {
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openCommandPalette()
        return
      }
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === '/') {
        e.preventDefault()
        openCommandPalette()
        return
      }
      const path = DIRECT_NAV_KEYS[e.key.toLowerCase()]
      if (path) {
        e.preventDefault()
        navigate(path)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, openCommandPalette])
}
