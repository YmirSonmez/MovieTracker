import { Link } from 'react-router-dom'
import { CheckCircle2, Database, Download, XCircle } from 'lucide-react'
import { useProfileStore } from '@/store/profileStore'
import { applyTheme } from '@/utils/theme'
import { isLiveDataConfigured } from '@/services'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { ROUTES } from '@/utils/routes'
import { Badge, Button, Select, Switch } from '@/components/ui'
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsRow'
import type { ThemePreference } from '@/types/user'

export function SettingsPage() {
  const settings = useProfileStore((s) => s.settings)
  const updateSettings = useProfileStore((s) => s.updateSettings)
  const liveData = isLiveDataConfigured()
  const { canInstall, promptInstall } = useInstallPrompt()

  return (
    <div className="flex max-w-2xl flex-col gap-8 py-6">
      <h1 className="text-2xl font-bold text-text">Ayarlar</h1>

      {canInstall && (
        <SettingsSection title="Uygulama">
          <SettingsRow
            title="Movie Tracker'ı yükle"
            description="Cihazına yükleyip bir uygulama gibi tam ekran kullan"
            control={
              <Button size="sm" onClick={promptInstall}>
                <Download className="h-3.5 w-3.5" /> Yükle
              </Button>
            }
          />
        </SettingsSection>
      )}

      <SettingsSection title="Görünüm">
        <SettingsRow
          title="Tema"
          description="Karanlık, aydınlık veya sistem tercihine göre"
          control={
            <Select
              size="sm"
              value={settings.theme}
              onValueChange={(v) => {
                updateSettings({ theme: v as ThemePreference })
                applyTheme(v as ThemePreference)
              }}
              options={[
                { value: 'dark', label: 'Karanlık' },
                { value: 'light', label: 'Aydınlık' },
                { value: 'system', label: 'Sistem' },
              ]}
            />
          }
        />
        <SettingsRow
          title="Kompakt düzen"
          description="Kartlar arasında daha az boşluk kullan"
          control={<Switch checked={settings.compactLayout} onCheckedChange={(v) => updateSettings({ compactLayout: v })} />}
        />
      </SettingsSection>

      <SettingsSection title="İzleme ve Takip">
        <SettingsRow
          title="Sonraki bölümü otomatik işaretle"
          description="Bir bölümü izlendi yaptığında bir öncekini de işaretle"
          control={<Switch checked={settings.autoMarkNextEpisode} onCheckedChange={(v) => updateSettings({ autoMarkNextEpisode: v })} />}
        />
        <SettingsRow
          title="İzlendi işaretlemeden önce sor"
          description="Yanlışlıkla işaretlemeyi önler"
          control={<Switch checked={settings.confirmBeforeMarkingWatched} onCheckedChange={(v) => updateSettings({ confirmBeforeMarkingWatched: v })} />}
        />
      </SettingsSection>

      <SettingsSection title="Veri">
        <SettingsRow
          title="Film/dizi verisi"
          description={liveData ? 'TMDB API anahtarı yapılandırılmış, canlı veri kullanılıyor.' : 'API anahtarı yok, dahili örnek katalog kullanılıyor.'}
          control={
            <Badge variant={liveData ? 'success' : 'neutral'}>
              {liveData ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {liveData ? 'TMDB bağlı' : 'Çevrimdışı katalog'}
            </Badge>
          }
        />
        <SettingsRow
          title="Dışa/içe aktarma ve yedekleme"
          description="Kitaplığını JSON/CSV olarak indir ya da geri yükle"
          control={
            <Button size="sm" variant="outline" asChild>
              <Link to={ROUTES.dataManagement}>
                <Database className="h-3.5 w-3.5" /> Veri Yönetimi
              </Link>
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection title="Hesap">
        <SettingsRow
          title="Depolama modu"
          description="Verilerin yalnızca bu tarayıcıda, cihazında saklanıyor."
          control={<Badge variant="accent">Yerel</Badge>}
        />
        <SettingsRow
          title="Bulut senkronizasyonu"
          description="Google Drive / Supabase gibi bir bulut yedeği - mimari hazır, henüz bağlı değil."
          control={<Badge variant="neutral">Yakında</Badge>}
        />
      </SettingsSection>

      <SettingsSection title="Gizlilik">
        <div className="py-3 text-sm text-text-muted">
          Movie Tracker hiçbir kişisel verini sunucuya göndermez. Her şey bu tarayıcının yerel deposunda (IndexedDB) tutulur.
        </div>
        <SettingsRow
          title="Yerel veriyi temizle"
          description="Tüm kitaplığını kalıcı olarak siler"
          control={
            <Button size="sm" variant="ghost" asChild>
              <Link to={ROUTES.dataManagement}>Veri Yönetimi&apos;ne git</Link>
            </Button>
          }
        />
      </SettingsSection>
    </div>
  )
}
