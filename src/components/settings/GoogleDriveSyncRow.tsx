import { useState } from 'react'
import { useCloudSyncStore } from '@/store/cloudSyncStore'
import { connectGoogleDrive, disconnectGoogleDrive, backupToDrive, isGoogleDriveConfigured, GoogleDriveError } from '@/services/googleDrive'
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
        toast({
          title: 'Drive’da zaten bir yedeğin var',
          description: email ? `${email} hesabında mevcut bir yedek bulundu. Üzerine yazmadan önce incele.` : 'Mevcut bir yedek bulundu. Üzerine yazmadan önce incele.',
          action: { label: 'Drive’dan Geri Yükle', onClick: () => { window.location.hash = ROUTES.dataManagement } },
        })
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
