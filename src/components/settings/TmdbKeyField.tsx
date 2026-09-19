import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useApiConfigStore } from '@/store/apiConfigStore'
import { verifyTMDBApiKey } from '@/services'
import { toast } from '@/store/toastStore'
import { Button, Input } from '@/components/ui'

export function TmdbKeyField() {
  const tmdbApiKey = useApiConfigStore((s) => s.config.tmdbApiKey)
  const updateConfig = useApiConfigStore((s) => s.updateConfig)

  const [draft, setDraft] = useState(tmdbApiKey ?? '')
  const [visible, setVisible] = useState(false)
  const [verifying, setVerifying] = useState(false)

  async function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) return
    setVerifying(true)
    const valid = await verifyTMDBApiKey(trimmed)
    setVerifying(false)
    if (!valid) {
      toast({ title: 'Anahtar doğrulanamadı', description: 'TMDB bu anahtarı kabul etmedi, kopyaladığından emin ol.', variant: 'danger' })
      return
    }
    await updateConfig({ tmdbApiKey: trimmed })
    toast({ title: 'TMDB anahtarı kaydedildi', description: 'Artık canlı film/dizi verisi kullanılıyor.', variant: 'success' })
  }

  async function handleClear() {
    setDraft('')
    await updateConfig({ tmdbApiKey: undefined })
    toast({ title: 'TMDB anahtarı kaldırıldı' })
  }

  return (
    <div className="flex flex-col gap-3 py-3">
      <div>
        <p className="text-sm font-medium text-text">Kendi TMDB API anahtarın</p>
        <p className="mt-0.5 text-xs text-text-subtle">
          Bu tarayıcıda saklanır ve dışa aktardığın yedeklere dahil edilir - yedek dosyanı kimseyle paylaşma.{' '}
          <a
            href="https://www.themoviedb.org/settings/api"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2"
          >
            Ücretsiz anahtar al
          </a>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Input
            type={visible ? 'text' : 'password'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="TMDB API anahtarı (v3)"
            aria-label="TMDB API anahtarı"
            className="w-56 pr-9"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Anahtarı gizle' : 'Anahtarı göster'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text"
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <Button size="sm" onClick={handleSave} loading={verifying} disabled={verifying || !draft.trim() || draft.trim() === tmdbApiKey}>
          Kaydet ve Test Et
        </Button>
        {tmdbApiKey && (
          <Button size="sm" variant="outline" onClick={handleClear}>
            Kaldır
          </Button>
        )}
      </div>
    </div>
  )
}
