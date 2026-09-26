import { createElement, lazy, useState, type ComponentType } from 'react'

const preloaders: Array<() => Promise<void>> = []

/**
 * React.lazy for a route page (pages take no props), plus a way to fetch the page's code ahead of time - and once
 * it's been fetched, the page renders directly instead of suspending for a
 * frame (plain lazy() still flashes its fallback on first render even when
 * the module is already downloaded).
 */
/**
 * `preload: false` keeps a page out of the background queue - for a page
 * whose code is heavy enough (the charts library on Statistics) that
 * evaluating it at a random moment could itself cause a stutter.
 */
export function lazyPage(load: () => Promise<ComponentType>, options: { preload?: boolean } = {}): ComponentType {
  let Loaded: ComponentType | null = null
  let pending: Promise<void> | null = null
  const preload = (): Promise<void> =>
    (pending ??= load().then(
      (component) => {
        Loaded = component
      },
      (error: unknown) => {
        pending = null // let a later attempt retry
        throw error
      },
    ))
  const Lazy = lazy(() => preload().then(() => ({ default: Loaded! })))
  if (options.preload !== false) preloaders.push(preload)

  function Page() {
    // Decided once per mount: switching from Lazy to Loaded mid-life would
    // remount the page and lose its state.
    const [ready] = useState(() => Loaded !== null)
    return createElement(ready && Loaded ? Loaded : Lazy)
  }
  return Page
}

/** Settle-in time after boot before any background preloading starts. */
const START_DELAY_MS = 3000

/** Fetches page code in the background, one page at a time and only when
 * the browser is genuinely idle (no deadline that would force it to run
 * mid-interaction), so later navigations render immediately. */
export function preloadPages(): void {
  const queue = [...preloaders]
  const whenIdle = (fn: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn) : setTimeout(fn, 500))
  const next = () => {
    const preload = queue.shift()
    if (preload) void preload().catch(() => {}).finally(() => whenIdle(next))
  }
  setTimeout(() => whenIdle(next), START_DELAY_MS)
}
