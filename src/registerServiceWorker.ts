import { registerSW } from 'virtual:pwa-register'

/** Long enough for the "leaving the app" sync flush to get its upload out. */
const SWITCH_DELAY_MS = 1500

/**
 * New versions download in the background as soon as they're deployed
 * (checked on load and hourly), then wait. The switch - which reloads the
 * page - happens only while the app is hidden: switching tabs, locking the
 * phone, going to the home screen. Coming back finds the new version
 * already running; nothing ever reloads in the middle of using it. If the
 * app is fully closed first, the next launch simply starts on it.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  let updateReady = false
  let switchTimer: ReturnType<typeof setTimeout> | undefined

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })

  document.addEventListener('visibilitychange', () => {
    clearTimeout(switchTimer)
    if (!updateReady || document.visibilityState !== 'hidden') return
    switchTimer = setTimeout(() => {
      if (document.visibilityState === 'hidden') void updateSW(true)
    }, SWITCH_DELAY_MS)
  })
}
