import { useState } from 'react'
import { AlertTriangle, Cloud, CloudOff, LogIn, RefreshCw } from 'lucide-react'
import { useSyncStore } from '@/store/syncStore'
import { useNow } from '@/hooks/useNow'
import { describeSync } from '@/utils/syncStatus'
import { syncNow } from '@/services/sync/engine'
import { cn } from '@/utils/cn'
import { SyncStatusDialog } from './SyncStatusDialog'

/**
 * The app's only always-visible trace of syncing: a quiet cloud when all is
 * well, and a clear call to action only when the user can do something
 * about it. Tapping it syncs right away; when something is wrong it opens
 * a panel that says what and offers the fix.
 */
export function SyncIndicator() {
  const phase = useSyncStore((s) => s.phase)
  const dirty = useSyncStore((s) => s.dirty)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const now = useNow()
  const [detailsOpen, setDetailsOpen] = useState(false)

  if (phase === 'disabled') return null

  const label = describeSync(phase, dirty, lastSyncedAt, now)
  const dialog = <SyncStatusDialog open={detailsOpen} onOpenChange={setDetailsOpen} />

  if (phase === 'needsAuth') {
    return (
      <>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          title={label}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-3 text-xs font-medium text-accent transition-colors hover:bg-accent/20 active:scale-[0.97]"
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Yeniden bağlan</span>
          <span className="sm:hidden">Bağlan</span>
        </button>
        {dialog}
      </>
    )
  }

  // Motion only while data is actually moving; edits waiting for the
  // upload (a second or two) get a quiet dot instead of a spinner.
  const busy = phase === 'syncing'
  const pending = dirty && phase === 'idle'
  const Icon = phase === 'offline' ? CloudOff : phase === 'error' ? AlertTriangle : busy ? RefreshCw : Cloud

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => {
          if (phase === 'error' || phase === 'offline') setDetailsOpen(true)
          else void syncNow({ manual: true })
        }}
        className={cn(
          'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-2 active:scale-[0.97]',
          phase === 'error' ? 'text-warning' : 'text-text-subtle hover:text-text',
        )}
      >
        <Icon className={cn('h-[18px] w-[18px]', busy && 'motion-safe:animate-spin')} strokeWidth={1.75} />
        {pending && <span aria-hidden="true" className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />}
      </button>
      {dialog}
    </>
  )
}
