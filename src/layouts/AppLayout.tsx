import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from '@/components/nav/TopBar'
import { Sidebar } from '@/components/nav/Sidebar'
import { BottomNav } from '@/components/nav/BottomNav'
import { BootSplash } from '@/components/nav/BootSplash'
import { CommandPalette } from '@/components/CommandPalette'
import { GoogleDriveConnectBanner } from '@/components/GoogleDriveConnectBanner'
import { Toaster } from '@/components/ui'
import { hydrateAllStores } from '@/store/init'
import { useProfileStore } from '@/store/profileStore'
import { applyTheme, watchSystemTheme } from '@/utils/theme'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { startAutoSync } from '@/services/autoSync'
import { preloadGoogleIdentity } from '@/services/googleDrive'

export function AppLayout() {
  const [ready, setReady] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    preloadGoogleIdentity()
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

  useEffect(() => {
    if (!ready) return
    applyTheme(useProfileStore.getState().settings.theme)
    return watchSystemTheme(() => useProfileStore.getState().settings.theme)
  }, [ready])

  useGlobalShortcuts(() => setPaletteOpen(true))

  if (!ready) return <BootSplash />

  return (
    <div className="min-h-dvh bg-bg text-text">
      <TopBar onOpenSearch={() => setPaletteOpen(true)} />
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 pb-24 pt-4 sm:px-6 lg:pb-10">
        <div className="hidden shrink-0 lg:block">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1 pb-6">
          <GoogleDriveConnectBanner />
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toaster />
    </div>
  )
}
