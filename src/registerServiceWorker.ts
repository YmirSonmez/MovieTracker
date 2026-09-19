import { registerSW } from 'virtual:pwa-register'

/**
 * With registerType: 'autoUpdate', this doesn't just register the service
 * worker - it also applies an update the moment one is found (the
 * generated SW already skips waiting and claims clients; this is what
 * actually reloads the open tab onto it) and re-checks periodically for
 * visitors who leave a tab open across a deploy. Call once at boot.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })

  void updateSW
}
