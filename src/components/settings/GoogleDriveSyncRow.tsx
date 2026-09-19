import { useState } from 'react'
import { useCloudSyncStore } from '@/store/cloudSyncStore'
import { connectGoogleDrive, disconnectGoogleDrive, isGoogleDriveConfigured, GoogleDriveError } from '@/services/googleDrive'
import { toast } from '@/store/toastStore'
import { Badge, Button } from '@/components/ui'
import { SettingsRow } from './SettingsRow'

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
      toast({ title: 'Google Drive bağlandı', description: email ?? undefined, variant: 'success' })
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
    ? `Bağlı: ${connectedEmail} - yedekle/geri yükle işlemleri için Veri Yönetimi'ne git.`
    : lastSyncedAt
      ? `Son senkron: ${new Date(lastSyncedAt).toLocaleString('tr-TR')}. Devam etmek için yeniden bağlan.`
      : 'Verilerini kendi Google Drive hesabına otomatik yedekle - hesabına başka kimse erişemez.'

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
