import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const STORAGE_KEY = 'movie-tracker-scroll'
const MAX_ENTRIES = 50
/** About a second of frames to wait for content (a lazy page, cached data
 * painting a frame late) to grow tall enough to scroll back into. */
const RESTORE_FRAMES = 60

function readStored(): Array<[string, number]> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Array<[string, number]>) : []
  } catch {
    return []
  }
}

/** Scroll position per history entry (router location key). Kept in
 * sessionStorage too, so a reload - or the phone evicting a backgrounded
 * app - doesn't lose it. */
const positions = new Map<string, number>(readStored())
let currentKey: string | null = null

function save(): void {
  while (positions.size > MAX_ENTRIES) positions.delete(positions.keys().next().value!)
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...positions]))
  } catch {
    // Storage blocked - positions still work for this page's lifetime.
  }
}

function restore(target: number): void {
  let frames = 0
  let cancelled = false
  // The user scrolling on their own always wins over the restore.
  const cancel = () => {
    cancelled = true
  }
  const events = ['wheel', 'touchstart', 'keydown'] as const
  for (const type of events) window.addEventListener(type, cancel, { once: true, passive: true })
  const attempt = () => {
    if (!cancelled) window.scrollTo(0, target)
    if (cancelled || Math.abs(window.scrollY - target) <= 1 || ++frames > RESTORE_FRAMES) {
      for (const type of events) window.removeEventListener(type, cancel)
      return
    }
    requestAnimationFrame(attempt)
  }
  attempt()
}

/**
 * Opening a new page starts it at the top; going back returns to exactly
 * where you were. (Out of the box, a single-page app does neither: a page
 * opened from deep in a list starts scrolled down, and "back" lands
 * somewhere arbitrary.) Changing only the query string (filters, search)
 * leaves the scroll alone.
 *
 * `active` is false while the app shell isn't rendered yet (boot splash):
 * restoring then would have nothing to scroll.
 */
export function useScrollMemory(active: boolean): void {
  const location = useLocation()
  const navigationType = useNavigationType()
  const previousPath = useRef<string | null>(null)

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (currentKey) positions.set(currentKey, window.scrollY)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', save)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', save)
    }
  }, [])

  useLayoutEffect(() => {
    if (!active) return
    const samePage = previousPath.current === location.pathname
    previousPath.current = location.pathname
    // Switch keys *before* scrolling: the scroll event this causes (and the
    // browser clamping the old page's offset to a shorter new page) must
    // not overwrite the position recorded for the page we just left.
    currentKey = location.key
    save()
    if (navigationType === 'POP') {
      // Nothing saved (an address typed by hand, an entry from before a
      // reload that storage lost) - treat it like a fresh page.
      const target = positions.get(location.key)
      if (target !== undefined) restore(target)
      else if (!samePage) window.scrollTo(0, 0)
    } else if (!samePage) {
      window.scrollTo(0, 0)
    }
  }, [active, location.key, location.pathname, navigationType])
}
