import { useState } from 'react'
import { CloudUpload, X } from 'lucide-react'
import { useCloudSyncStore } from '@/store/cloudSyncStore'
import { connectGoogleDrive, backupToDrive, isGoogleDriveConfigured, GoogleDriveError } from '@/services/googleDrive'
import { toast } from '@/store/toastStore'
import { Button } from '@/components/ui'
import { DRIVE_BANNER_DISMISSED_KEY } from '@/utils/constants'
import { ROUTES } from '@/utils/routes'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DRIVE_BANNER_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * A one-click nudge to connect Google Drive, shown on every page until the
 * visitor connects or dismisses it - so setting up backup doesn't require
 * finding it in Settings first. Never shown again once a backup exists
 * (`meta.driveFileId`), even in a brand-new session with no live token -
 * that's the normal, expected state for someone who already set this up,
 * not someone who needs the nudge.
 */
export function GoogleDriveConnectBanner() {
  const driveFileId = useCloudSyncStore((s) => s.meta.driveFileId)
  const connectedEmail = useCloudSyncStore((s) => s.connectedEmail)
  const [dismissed, setDismissed] = useState(readDismissed)
  const [connecting, setConnecting] = useState(false)

  if (!isGoogleDriveConfigured() || dismissed || driveFileId || connectedEmail) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DRIVE_BANNER_DISMISSED_KEY, '1')
    } catch {
      // Private browsing / storage blocked - banner just reappears next visit.
    }
  }

  async function handleConnect() {
    setConnecting(true)
    try {
      await connectGoogleDrive()
      const result = await backupToDrive()
      if ('conflict' in result) {
        toast({
          title: 'Drive’da zaten bir yedeğin var',
          description: 'Üzerine yazmadan önce onu incele - Veri Yönetimi’nde "Drive’dan Geri Yükle" ile aç.',
          action: { label: 'Veri Yönetimi', onClick: () => { window.location.hash = ROUTES.dataManagement } },
        })
      } else if ('suspiciousDrop' in result) {
        toast({
          title: 'Kitaplığın Drive’daki yedekten çok daha küçük',
          description: 'Olası bir veri kaybının üzerine yazmamak için durduruldu. Veri Yönetimi’nden kontrol et.',
          action: { label: 'Veri Yönetimi', onClick: () => { window.location.hash = ROUTES.dataManagement } },
        })
      } else {
        toast({ title: 'Google Drive’a bağlandı', description: 'İlk yedeğin alındı.', variant: 'success' })
      }
      dismiss()
    } catch (e) {
      toast({ title: 'Bağlantı başarısız oldu', description: e instanceof GoogleDriveError ? e.message : undefined, variant: 'danger' })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <CloudUpload className="h-5 w-5 shrink-0 text-accent" />
        <p className="min-w-0 text-sm text-text">
          Verini kaybetme riskine karşı kendi Google Drive hesabına yedekle - ayarlara gitmene gerek yok, tek tıkla hallolur.
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3">
        <Button size="sm" onClick={handleConnect} loading={connecting} disabled={connecting}>
          Bağlan ve Yedekle
        </Button>
        <button type="button" onClick={dismiss} aria-label="Kapat" className="shrink-0 text-text-subtle hover:text-text">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
