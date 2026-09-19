import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloudUpload } from 'lucide-react'
import { useCloudSyncStore } from '@/store/cloudSyncStore'
import { connectGoogleDrive, backupToDrive, restoreFromDrive, isGoogleDriveConfigured, GoogleDriveError } from '@/services/googleDrive'
import { toast } from '@/store/toastStore'
import { Button, Card } from '@/components/ui'
import { APP_NAME } from '@/utils/constants'
import { ROUTES } from '@/utils/routes'

/**
 * The only way into the app - AppLayout redirects here whenever there's no
 * active Google Drive session (see requireDriveAuth). Deliberately outside
 * AppLayout's own chrome (no nav, no bottom bar): there is nothing to
 * navigate to yet. Built as a list of connection methods rather than a
 * single button so a second one (should this app ever grow beyond a single
 * personal Google account) has an obvious place to go.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const [connecting, setConnecting] = useState(false)
  const driveConfigured = isGoogleDriveConfigured()

  async function handleConnect() {
    setConnecting(true)
    try {
      await connectGoogleDrive()
      const result = await backupToDrive()
      if ('conflict' in result) {
        // Fetch the existing backup now (harmless, it's a download) and hand
        // it to Data Management so reviewing it doesn't take a second trip.
        try {
          const { bundle, preview } = await restoreFromDrive()
          useCloudSyncStore.getState().setPendingImport({ bundle, preview })
        } catch {
          // Fetch failed - Veri Yönetimi's own "Drive'dan Geri Yükle" still works.
        }
        toast({
          title: 'Drive’da zaten bir yedeğin var',
          description: 'Üzerine yazmadan önce incelemen için Veri Yönetimi’ne yönlendiriliyorsun.',
        })
        navigate(ROUTES.dataManagement, { replace: true })
      } else {
        // A brand-new account, or a device already reconciled with Drive -
        // either way there's nothing pending review, go straight in.
        toast({ title: 'Google Drive’a bağlandı', variant: 'success' })
        navigate(ROUTES.home, { replace: true })
      }
    } catch (e) {
      toast({ title: 'Bağlantı başarısız oldu', description: e instanceof GoogleDriveError ? e.message : undefined, variant: 'danger' })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-bg px-4">
      <div className="flex flex-col items-center gap-3">
        <svg width="48" height="48" viewBox="0 0 100 100" aria-hidden="true">
          <rect width="100" height="100" rx="24" fill="#16161a" />
          <circle cx="50" cy="50" r="32" fill="none" stroke="#f0a93a" strokeWidth="8" strokeLinecap="round" strokeDasharray="90 201" />
          <path d="M42 35 L68 50 L42 65 Z" fill="#f0a93a" />
        </svg>
        <h1 className="text-xl font-bold text-text">{APP_NAME}</h1>
        <p className="max-w-xs text-center text-sm text-text-muted">
          Verilerin kendi Google Drive hesabında saklanır. Devam etmek için bağlan.
        </p>
      </div>

      <Card className="flex w-full max-w-sm flex-col gap-4 p-5">
        {driveConfigured ? (
          <>
            <div className="flex items-center gap-3">
              <CloudUpload className="h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">Google Drive</p>
                <p className="text-xs text-text-subtle">Kendi hesabında, sadece bu uygulamanın oluşturduğu dosyada.</p>
              </div>
            </div>
            <Button onClick={handleConnect} loading={connecting} disabled={connecting} className="w-full">
              Google ile Bağlan
            </Button>
          </>
        ) : (
          <p className="text-sm text-text-muted">
            Bu dağıtımda Google bağlantısı yapılandırılmamış - devam etmek için önce bir Google Client ID tanımlanmalı.
          </p>
        )}
      </Card>
    </div>
  )
}
