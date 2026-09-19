import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { TopBar } from '@/components/nav/TopBar'
import { Sidebar } from '@/components/nav/Sidebar'
import { BottomNav } from '@/components/nav/BottomNav'
import { BootSplash } from '@/components/nav/BootSplash'
import { CommandPalette } from '@/components/CommandPalette'
import { Toaster } from '@/components/ui'
import { hydrateAllStores } from '@/store/init'
import { useProfileStore } from '@/store/profileStore'
import { useCloudSyncStore } from '@/store/cloudSyncStore'
import { applyTheme, watchSystemTheme } from '@/utils/theme'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { startAutoSync } from '@/services/autoSync'
import { preloadGoogleIdentity, hasValidDriveToken, isGoogleDriveConfigured } from '@/services/googleDrive'
import { ROUTES } from '@/utils/routes'

/** How often to notice a token that expired while the tab stayed open and
 * send the visitor back to the login screen - doesn't need to be tighter
 * than this given tokens last about an hour. */
const AUTH_RECHECK_MS = 30_000

export function AppLayout() {
  const [ready, setReady] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const connectedEmail = useCloudSyncStore((s) => s.connectedEmail)

  useEffect(() => {
    let cancelled = false
    // Synchronous (restores a still-valid cached token from localStorage,
    // if any) - by the time `ready` flips true below, `authorized` already
    // reflects it, so there's no flash of the login screen for someone
    // who's still actually signed in.
    preloadGoogleIdentity()
    setAuthorized(!isGoogleDriveConfigured() || hasValidDriveToken())
    hydrateAllStores().then(() => {
      if (!cancelled) {
        setReady(true)
        startAutoSync()
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Re-checks on every connect/disconnect (immediate) and on a timer
  // (catches a token quietly expiring while the tab stays open).
  useEffect(() => {
    setAuthorized(!isGoogleDriveConfigured() || hasValidDriveToken())
  }, [connectedEmail])

  useEffect(() => {
    if (!isGoogleDriveConfigured()) return
    const id = setInterval(() => setAuthorized(hasValidDriveToken()), AUTH_RECHECK_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!ready) return
    applyTheme(useProfileStore.getState().settings.theme)
    return watchSystemTheme(() => useProfileStore.getState().settings.theme)
  }, [ready])

  useGlobalShortcuts(() => setPaletteOpen(true))

  if (!ready) return <BootSplash />
  if (!authorized) return <Navigate to={ROUTES.login} replace />

  return (
    <div className="min-h-dvh bg-bg text-text">
      <TopBar onOpenSearch={() => setPaletteOpen(true)} />
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 pb-24 pt-4 sm:px-6 lg:pb-10">
        <div className="hidden shrink-0 lg:block">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1 pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toaster />
    </div>
  )
}
