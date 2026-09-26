import { useState } from 'react'
import { AlertTriangle, LogIn, LogOut, RefreshCw } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { SettingsRow, SettingsSection } from './SettingsRow'
import { useNow } from '@/hooks/useNow'
import { describeSync } from '@/utils/syncStatus'
import { useSyncStore } from '@/store/syncStore'
import { beginSignIn, getAccount, isGoogleConfigured } from '@/services/auth/google'
import { flushPendingChanges, signOut, syncNow } from '@/services/sync/engine'
import { publicUrl } from '@/utils/publicUrl'

export function AccountSection() {
  const phase = useSyncStore((s) => s.phase)
  const dirty = useSyncStore((s) => s.dirty)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const error = useSyncStore((s) => s.error)
  const now = useNow()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [unsyncedWarning, setUnsyncedWarning] = useState(false)
  const account = getAccount()

  if (!isGoogleConfigured() || !account) {
    return (
      <SettingsSection title="Hesap">
        <p className="py-3 text-sm text-text-muted">
          Bu dağıtımda Google girişi yapılandırılmamış; verilerin yalnızca bu tarayıcıda saklanıyor.
        </p>
      </SettingsSection>
    )
  }

  async function handleSignOut() {
    setSigningOut(true)
    // Last chance to get pending edits up - after this they're deleted.
    const flushed = await flushPendingChanges()
    if (!flushed && !unsyncedWarning) {
      setUnsyncedWarning(true)
      setSigningOut(false)
      return
    }
    await signOut()
  }

  return (
    <SettingsSection title="Hesap">
      <div className="flex items-center gap-3 py-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold uppercase text-accent"
        >
          {account.email.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{account.email}</p>
          <p className="text-xs text-text-subtle">{describeSync(phase, dirty, lastSyncedAt, now)}</p>
        </div>
      </div>

      {phase === 'error' && error && (
        <p className="flex items-start gap-2 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {phase === 'needsAuth' ? (
        <SettingsRow
          title="Oturumu yenile"
          description="Değişikliklerin bu cihazda duruyor; oturum yenilenince Drive’a gönderilir."
          control={
            <Button size="sm" onClick={() => beginSignIn()}>
              <LogIn className="h-3.5 w-3.5" /> Yeniden bağlan
            </Button>
          }
        />
      ) : (
        <SettingsRow
          title="Google Drive eşitlemesi"
          description="Değişiklikler birkaç saniye içinde kendiliğinden gönderilir; diğer cihazlarındakiler açtığında gelir."
          control={
            <Button size="sm" variant="outline" onClick={() => void syncNow()} disabled={phase === 'syncing' || phase === 'offline'}>
              <RefreshCw className={phase === 'syncing' ? 'h-3.5 w-3.5 motion-safe:animate-spin' : 'h-3.5 w-3.5'} /> Şimdi eşitle
            </Button>
          }
        />
      )}

      <SettingsRow
        title="Çıkış yap"
        description="Bu cihazdaki kopya silinir. Drive’daki verin durur; tekrar giriş yaptığında geri gelir."
        control={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setUnsyncedWarning(false)
              setConfirmOpen(true)
            }}
          >
            <LogOut className="h-3.5 w-3.5" /> Çıkış yap
          </Button>
        }
      />

      <p className="py-3 text-xs text-text-subtle">
        Verilerin bu cihazda ve Google Drive’ının yalnızca bu uygulamanın görebildiği gizli klasöründe saklanır; bizim bir
        sunucumuz yok.{' '}
        <a href={publicUrl('privacy.html')} className="text-text-muted underline underline-offset-2 hover:text-text">
          Gizlilik Politikası
        </a>
      </p>

      <Modal
        open={confirmOpen}
        onOpenChange={(open) => !signingOut && setConfirmOpen(open)}
        title="Çıkış yapılsın mı?"
        description={`${account.email} bu cihazdan çıkarılacak ve buradaki kopya silinecek. Drive’daki verine dokunulmaz.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={signingOut}>
              Vazgeç
            </Button>
            <Button variant="danger" onClick={handleSignOut} loading={signingOut} disabled={signingOut}>
              {unsyncedWarning ? 'Yine de çıkış yap' : 'Çıkış yap'}
            </Button>
          </>
        }
      >
        {unsyncedWarning && (
          <p role="alert" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-text">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            Bu cihazda henüz Drive’a gönderilemeyen değişiklikler var. Şimdi çıkış yaparsan bunlar kaybolur. İnternete bağlanıp
            birkaç saniye bekleyebilir ya da yine de çıkabilirsin.
          </p>
        )}
      </Modal>
    </SettingsSection>
  )
}
