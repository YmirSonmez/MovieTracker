import { registerSW } from 'virtual:pwa-register'
import { setAppUpdater } from './services/appUpdate'

/** Long enough for the "leaving the app" sync flush to get its upload out. */
const SWITCH_DELAY_MS = 1500
/** A new version found this soon after launch, before the first tap, is
 * switched to straight away: the user hasn't started doing anything yet,
 * and otherwise a device that hadn't opened the app in weeks would spend
 * the whole session on the old version it had cached. */
const LAUNCH_WINDOW_MS = 10_000

/**
 * New versions download in the background as soon as they're deployed
 * (checked on load and hourly), then wait. The switch - which reloads the
 * page - happens right at launch if nothing has been touched yet, and
 * otherwise only while the app is hidden: switching tabs, locking the
 * phone, going to the home screen. Coming back finds the new version
 * already running; nothing ever reloads in the middle of using it. If the
 * app is fully closed first, the next launch simply starts on it.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  let updateReady = false
  let interacted = false
  let switchTimer: ReturnType<typeof setTimeout> | undefined
  let registration: ServiceWorkerRegistration | undefined

  const markInteracted = () => {
    interacted = true
  }
  window.addEventListener('pointerdown', markInteracted, { once: true, capture: true })
  window.addEventListener('keydown', markInteracted, { once: true, capture: true })

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true
      if (!interacted && performance.now() < LAUNCH_WINDOW_MS) void updateSW(true)
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      registration = reg
      setInterval(() => void reg.update(), 60 * 60 * 1000)
    },
  })

  setAppUpdater(async () => {
    if (!updateReady && registration) {
      // Not downloaded yet - look now, and give it a moment to install.
      await registration.update().catch(() => {})
      const deadline = Date.now() + 8000
      while (!updateReady && registration.installing && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
    }
    if (updateReady) await updateSW(true)
    else window.location.reload()
  })

  document.addEventListener('visibilitychange', () => {
    clearTimeout(switchTimer)
    if (!updateReady || document.visibilityState !== 'hidden') return
    switchTimer = setTimeout(() => {
      if (document.visibilityState === 'hidden') void updateSW(true)
    }, SWITCH_DELAY_MS)
  })
}
