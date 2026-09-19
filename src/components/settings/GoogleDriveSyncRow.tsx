import { useState } from 'react'
import { useCloudSyncStore } from '@/store/cloudSyncStore'
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  backupToDrive,
  restoreFromDrive,
  isGoogleDriveConfigured,
  GoogleDriveError,
} from '@/services/googleDrive'
import { toast } from '@/store/toastStore'
import { Badge, Button } from '@/components/ui'
import { SettingsRow } from './SettingsRow'
import { ROUTES } from '@/utils/routes'

export function GoogleDriveSyncRow() {
  const configured = isGoogleDriveConfigured()
  const connectedEmail = useCloudSyncStore((s) => s.connectedEmail)
  const lastSyncedAt = useCloudSyncStore((s) => s.meta.lastSyncedAt)
  const [connecting, setConnecting] = useState(false)

  if (!configured) {
    return (
      <SettingsRow
        title="Google Drive yedekleme"
        description="Bu dağıtımda Google bağlantısı yapılandırılmamış."
        control={<Badge variant="neutral">Kullanılamıyor</Badge>}
      />
    )
  }

  async function handleConnect() {
    setConnecting(true)
    try {
      const { email } = await connectGoogleDrive()
      const result = await backupToDrive()
      if ('conflict' in result) {
        // Fetch the existing backup now (harmless, it's a download) and hand
        // it off so Veri Yönetimi already shows it - connecting on a new
        // device shouldn't require noticing this toast AND remembering to
        // press restore again yourself.
        try {
          const { bundle, preview } = await restoreFromDrive()
          useCloudSyncStore.getState().setPendingImport({ bundle, preview })
        } catch {
          // Fetch failed - fall back to just pointing them at the page below.
        }
        toast({
          title: 'Drive’da zaten bir yedeğin var',
          description: email
            ? `${email} hesabında mevcut bir yedek bulundu - incelemen için Veri Yönetimi’ne yönlendiriliyorsun.`
            : 'Mevcut bir yedek bulundu - incelemen için Veri Yönetimi’ne yönlendiriliyorsun.',
        })
        window.location.hash = ROUTES.dataManagement
      } else if ('suspiciousDrop' in result) {
        toast({
          title: 'Kitaplığın Drive’daki yedekten çok daha küçük',
          description: 'Olası bir veri kaybının üzerine yazmamak için durduruldu. Veri Yönetimi’nden kontrol et.',
          action: { label: 'Veri Yönetimi', onClick: () => { window.location.hash = ROUTES.dataManagement } },
        })
      } else if ('remoteChanged' in result) {
        try {
          const { bundle, preview } = await restoreFromDrive()
          useCloudSyncStore.getState().setPendingImport({ bundle, preview })
        } catch {
          // Fetch failed - fall back to just pointing them at the page below.
        }
        toast({
          title: 'Başka bir cihazdan yeni bir değişiklik var',
          description: 'Üzerine yazmadan önce incelemen için Veri Yönetimi’ne yönlendiriliyorsun.',
        })
        window.location.hash = ROUTES.dataManagement
      } else {
        toast({ title: 'Google Drive bağlandı', description: email ? `${email} - ilk yedeğin alındı.` : 'İlk yedeğin alındı.', variant: 'success' })
      }
    } catch (e) {
      toast({ title: 'Bağlantı başarısız oldu', description: e instanceof GoogleDriveError ? e.message : undefined, variant: 'danger' })
    } finally {
      setConnecting(false)
    }
  }

  function handleDisconnect() {
    disconnectGoogleDrive()
    toast({ title: 'Google Drive bağlantısı kesildi' })
  }

  const description = connectedEmail
    ? `Bağlı: ${connectedEmail} - değişikliklerin otomatik olarak yedekleniyor, elle bir şey yapman gerekmez.`
    : lastSyncedAt
      ? `Son senkron: ${new Date(lastSyncedAt).toLocaleString('tr-TR')}. Otomatik yedeklemenin devam etmesi için yeniden bağlan.`
      : 'Bağlandığında değişikliklerin otomatik olarak yedeklenir - bir daha elle "yedekle" demen gerekmez.'

  return (
    <SettingsRow
      title="Google Drive yedekleme"
      description={description}
      control={
        connectedEmail ? (
          <Button size="sm" variant="outline" onClick={handleDisconnect}>
            Bağlantıyı Kes
          </Button>
        ) : (
          <Button size="sm" onClick={handleConnect} loading={connecting} disabled={connecting}>
            Bağlan
          </Button>
        )
      }
    />
  )
}
