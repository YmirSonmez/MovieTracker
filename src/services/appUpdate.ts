/**
 * A bridge between the service worker registration (src/registerServiceWorker.ts)
 * and code that needs the newest version of the app right now - the sync
 * engine, when Drive's copy was written by a newer version than this one.
 * A plain reload isn't enough for that: while an old service worker still
 * controls the page, reloading serves the old version again.
 */

type Updater = () => Promise<void>

let updater: Updater | null = null

export function setAppUpdater(fn: Updater): void {
  updater = fn
}

/** Switches to the newest deployed version (reloading the page), or just
 * reloads if there's no service worker to go through. */
export async function updateApp(): Promise<void> {
  if (updater) await updater()
  else window.location.reload()
}
