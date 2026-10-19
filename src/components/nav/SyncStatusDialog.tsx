import { useState } from 'react'
import { AlertTriangle, CloudOff, Download, ExternalLink, LogIn, RefreshCw, ShieldCheck, Wrench } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { useSyncStore } from '@/store/syncStore'
import { useNow } from '@/hooks/useNow'
import { formatSyncTime } from '@/utils/syncStatus'
import { getAccount } from '@/services/auth/google'
import { reconnectGoogle, repairSync, syncNow } from '@/services/sync/engine'
import { updateApp } from '@/services/appUpdate'

function retryLabel(retryAt: number | null, now: number): string | null {
  if (!retryAt || retryAt <= now) return null
  const seconds = Math.ceil((retryAt - now) / 1000)
  return seconds < 60 ? `${seconds} sn sonra kendiliğinden tekrar denenecek.` : `${Math.ceil(seconds / 60)} dk sonra kendiliğinden tekrar denenecek.`
}

/**
 * What the sync chip opens when something is wrong: what happened, in
 * plain words, that nothing on this device is lost, and the one or two
 * things that actually fix it. "Eşitlemeyi onar" is always there as the
 * last resort - it re-reads Drive from scratch and merges, deleting nothing.
 */
export function SyncStatusDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const phase = useSyncStore((s) => s.phase)
  const error = useSyncStore((s) => s.error)
  const problem = useSyncStore((s) => s.problem)
  const dirty = useSyncStore((s) => s.dirty)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const retryAt = useSyncStore((s) => s.retryAt)
  const errorDetail = useSyncStore((s) => s.errorDetail)
  const authFailure = useSyncStore((s) => s.authFailure)
  const now = useNow(1000)
  const [busy, setBusy] = useState<'retry' | 'repair' | 'update' | null>(null)
  const account = getAccount()

  async function run(kind: 'retry' | 'repair' | 'update', action: () => Promise<void>) {
    setBusy(kind)
    try {
      await action()
    } finally {
      setBusy(null)
    }
  }

  const needsAuth = phase === 'needsAuth'
  const title = needsAuth ? 'Google oturumunu yenile' : phase === 'offline' ? 'Çevrimdışı' : phase === 'error' ? 'Eşitleme sorunu' : 'Eşitleme'

  let message: string
  if (needsAuth) {
    // A silent renewal's own failure ("Google needs you to sign in") says
    // nothing the default doesn't - unless the answer was the wrong account
    // or a missing permission, which the user has to act on differently.
    const specific = authFailure && (!authFailure.silent || authFailure.reason === 'mismatch' || authFailure.reason === 'scope')
    message = specific
      ? authFailure.message
      : 'Google oturumunun süresi doldu. Drive’a erişebilmek için bir kez yeniden bağlanman yeterli.'
  } else if (phase === 'offline') {
    message = 'İnternet bağlantısı yok. Bağlantı gelince eşitleme kendiliğinden devam eder.'
  } else if (phase === 'error') {
    message = error ?? 'Eşitleme tamamlanamadı.'
  } else {
    message = dirty ? 'Değişiklikler gönderiliyor…' : `Her şey eşitlendi · ${formatSyncTime(lastSyncedAt, now)}`
  }

  const retry = phase === 'error' ? retryLabel(retryAt, now) : null

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={account ? account.email : undefined}>
      <div className="space-y-4">
        <p className="flex items-start gap-2.5 text-sm text-text">
          {phase === 'offline' ? (
            <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          )}
          <span>
            {message}
            {retry && <span className="mt-1 block text-text-muted">{retry}</span>}
            {phase === 'error' && errorDetail && (
              <span className="mt-1 block break-words font-mono text-xs text-text-subtle">{errorDetail}</span>
            )}
          </span>
        </p>

        <p className="flex items-start gap-2.5 rounded-md border border-border bg-surface-2/50 p-3 text-sm text-text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>
            Yaptığın her şey bu cihazda kayıtlı, hiçbir şey kaybolmadı.
            {dirty ? ' Bekleyen değişikliklerin sorun çözülünce Drive’a gönderilecek.' : ''} Son eşitleme:{' '}
            {formatSyncTime(lastSyncedAt, now)}.
          </span>
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {(needsAuth || (phase === 'error' && problem === 'forbidden')) && (
            <Button onClick={reconnectGoogle}>
              <LogIn className="h-4 w-4" />
              {authFailure?.reason === 'mismatch' ? 'Doğru hesabı seç' : 'Google ile yeniden bağlan'}
            </Button>
          )}
          {phase === 'error' && problem === 'outdated' && (
            <Button onClick={() => void run('update', updateApp)} loading={busy === 'update'} disabled={busy !== null}>
              <Download className="h-4 w-4" /> Uygulamayı güncelle
            </Button>
          )}
          {phase === 'error' && problem === 'storageFull' && (
            <Button asChild variant="outline">
              <a href="https://one.google.com/storage" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Drive alanını yönet
              </a>
            </Button>
          )}
          {!needsAuth && phase !== 'offline' && (
            <Button
              variant={phase === 'error' && problem !== 'outdated' && problem !== 'storageFull' && problem !== 'forbidden' ? 'primary' : 'outline'}
              onClick={() => void run('retry', () => syncNow({ manual: true }))}
              loading={busy === 'retry' || phase === 'syncing'}
              disabled={busy !== null || phase === 'syncing'}
            >
              <RefreshCw className="h-4 w-4" /> Şimdi tekrar dene
            </Button>
          )}
          {phase === 'error' && problem !== 'forbidden' && (
            <Button variant="outline" onClick={reconnectGoogle}>
              <LogIn className="h-4 w-4" /> Google ile yeniden bağlan
            </Button>
          )}
          {phase === 'error' && (
            <Button variant="ghost" onClick={() => void run('repair', repairSync)} loading={busy === 'repair'} disabled={busy !== null}>
              <Wrench className="h-4 w-4" /> Eşitlemeyi onar
            </Button>
          )}
        </div>
        {phase === 'error' && (
          <p className="text-xs text-text-subtle">
            “Eşitlemeyi onar”, Drive’daki kopyanı baştan okuyup bu cihazdakiyle birleştirir; hiçbir veri silinmez.
          </p>
        )}
      </div>
    </Modal>
  )
}
