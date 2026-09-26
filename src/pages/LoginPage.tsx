import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle, EyeOff, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui'
import { beginSignIn, getAccount, isGoogleConfigured } from '@/services/auth/google'
import { useSyncStore } from '@/store/syncStore'
import { useOnline } from '@/hooks/useOnline'
import { publicUrl } from '@/utils/publicUrl'
import { APP_NAME } from '@/utils/constants'
import { ROUTES } from '@/utils/routes'

const POINTS = [
  {
    icon: RefreshCw,
    title: 'Her cihazda aynı kitaplık',
    text: 'Telefonda işaretlediğin bölüm bilgisayarında da işaretli. Eşitleme kendiliğinden olur.',
  },
  {
    icon: EyeOff,
    title: 'Veriler senin Drive’ında',
    text: 'Drive’ında yalnızca bu uygulamanın görebildiği gizli bir klasörde durur. Sunucumuz yok.',
  },
  {
    icon: WifiOff,
    title: 'İnternetsiz de çalışır',
    text: 'Bağlantı yokken yaptıkların cihazda kalır, bağlanınca Drive’a gider.',
  },
]

/**
 * The one screen shown to a device that isn't linked to an account yet.
 * Outside AppLayout's chrome on purpose - there's nothing to navigate to.
 * Signing in leaves the page for Google and comes back to the app root
 * (see services/auth/google.ts); errors from that round trip land here.
 */
export function LoginPage() {
  const [leaving, setLeaving] = useState(false)
  const failure = useSyncStore((s) => s.authFailure)
  const online = useOnline()
  const configured = isGoogleConfigured()

  if (configured && getAccount()) return <Navigate to={ROUTES.home} replace />

  function signIn() {
    setLeaving(true)
    useSyncStore.setState({ authFailure: null })
    beginSignIn({ returnTo: ROUTES.home, forceConsent: failure?.reason === 'scope' })
  }

  return (
    <div className="min-h-dvh bg-bg text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-8 pt-[max(3rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5">
          <svg width="32" height="32" viewBox="0 0 100 100" aria-hidden="true">
            <rect width="100" height="100" rx="24" fill="var(--color-surface)" stroke="var(--color-border)" />
            <circle
              cx="50"
              cy="50"
              r="32"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="176 201"
              transform="rotate(-90 50 50)"
            />
            <path d="M42 35 L68 50 L42 65 Z" fill="var(--color-accent)" />
          </svg>
          <span className="text-base font-bold tracking-tight">{APP_NAME}</span>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10">
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            İzlediğin her şey, tüm cihazlarında.
          </h1>
          <p className="mt-3 text-pretty text-text-muted">
            Google hesabınla bir kez giriş yap. Kitaplığın, puanların ve listelerin kendi Google Drive’ında saklanır.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {configured ? (
              <>
                <Button size="lg" className="w-full" onClick={signIn} loading={leaving} disabled={leaving || !online}>
                  {failure?.reason === 'scope' ? 'İzin vererek tekrar dene' : 'Google ile devam et'}
                </Button>
                {!online && (
                  <p className="flex items-center gap-2 text-sm text-text-subtle">
                    <WifiOff className="h-4 w-4 shrink-0" /> Giriş için internet bağlantısı gerekiyor.
                  </p>
                )}
                {failure && (
                  <p role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-text">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    {failure.message}
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-md border border-border bg-surface p-4 text-sm text-text-muted">
                Bu dağıtımda Google girişi yapılandırılmamış. Yayınlamadan önce bir Google Client ID tanımlanmalı (README’ye bak).
              </p>
            )}
          </div>

          <ul className="mt-10 flex flex-col gap-5">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-0.5 text-sm text-text-subtle">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-text-subtle">
          Devam ederek{' '}
          <a href={publicUrl('privacy.html')} className="text-text-muted underline underline-offset-2 hover:text-text">
            Gizlilik Politikası
          </a>
          ’nı kabul etmiş olursun.
        </p>
      </div>
    </div>
  )
}
