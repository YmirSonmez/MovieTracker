import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { TopBar } from '@/components/nav/TopBar'
import { Sidebar } from '@/components/nav/Sidebar'
import { BottomNav } from '@/components/nav/BottomNav'
import { BootSplash } from '@/components/nav/BootSplash'
import { CommandPalette } from '@/components/CommandPalette'
import { Toaster } from '@/components/ui'
import { bootStores } from '@/store/init'
import { useProfileStore } from '@/store/profileStore'
import { useSyncStore } from '@/store/syncStore'
import { toast } from '@/store/toastStore'
import { applyTheme, watchSystemTheme } from '@/utils/theme'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { useScrollMemory } from '@/hooks/useScrollMemory'
import { preloadPages } from '@/utils/lazyPage'
import { getAccessToken, getAccount, isGoogleConfigured } from '@/services/auth/google'
import { hasSyncedBefore, startSync, syncNow } from '@/services/sync/engine'
import { warmQueryCache } from '@/services'
import { ROUTES } from '@/utils/routes'

/** A first-time device waits this long at most for its data before showing
 * the app anyway (sync carries on in the background). */
const FIRST_SYNC_WAIT_MS = 20_000

export function AppLayout() {
  const [ready, setReady] = useState(false)
  const [fetchingAccount, setFetchingAccount] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const theme = useProfileStore((s) => s.settings.theme)
  // The only gate: is this device linked to an account at all? An expired
  // token never locks anyone out - local data stays usable and sync
  // catches up once the session is renewed.
  const signedOut = isGoogleConfigured() && !getAccount()

  useEffect(() => {
    if (signedOut) return
    let cancelled = false
    let stopSync: (() => void) | undefined
    warmQueryCache()
    void (async () => {
      await bootStores()
      if (cancelled) return
      const firstTime = isGoogleConfigured() && Boolean(getAccessToken()) && navigator.onLine && !(await hasSyncedBefore())
      if (cancelled) return
      setFetchingAccount(firstTime)
      setReady(true)
      stopSync = startSync()
      preloadPages()
      if (firstTime) {
        await Promise.race([syncNow(), new Promise((resolve) => setTimeout(resolve, FIRST_SYNC_WAIT_MS))])
        if (!cancelled) setFetchingAccount(false)
      }
    })()
    return () => {
      cancelled = true
      stopSync?.()
    }
  }, [signedOut])

  // Re-applied whenever the setting changes - including when it arrives
  // from another device.
  useEffect(() => {
    if (!ready) return
    applyTheme(theme)
    return watchSystemTheme(() => useProfileStore.getState().settings.theme)
  }, [ready, theme])

  // A renewal the user started themselves (the "Yeniden bağlan" button)
  // that didn't work. Silent renewals fail quietly: the sync chip says it.
  useEffect(() => {
    const failure = useSyncStore.getState().authFailure
    if (!failure || failure.silent || signedOut) return
    useSyncStore.setState({ authFailure: null })
    toast({ title: 'Google oturumu yenilenemedi', description: failure.message, variant: 'danger' })
  }, [signedOut])

  useGlobalShortcuts(() => setPaletteOpen(true))
  useScrollMemory(ready && !fetchingAccount)

  if (signedOut) return <Navigate to={ROUTES.login} replace />
  if (!ready) return <BootSplash />
  if (fetchingAccount) return <BootSplash message="Verilerin Google Drive’dan getiriliyor…" />

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
