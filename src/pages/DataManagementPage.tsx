import { useRef, useState } from 'react'
import { AlertTriangle, Download, KeyRound, Trash2, Upload } from 'lucide-react'
import { useLibraryStore } from '@/store/libraryStore'
import { useRatingsStore } from '@/store/ratingsStore'
import { useListsStore } from '@/store/listsStore'
import { toast } from '@/store/toastStore'
import {
  buildExportBundle,
  buildImportPreview,
  exportAsCSV,
  exportAsJSON,
  applyImport,
  parseImportBundle,
  ImportValidationError,
} from '@/utils/exportImport'
import { deleteAllData, DeleteAllError } from '@/services/sync/engine'
import { getAccount, isGoogleConfigured } from '@/services/auth/google'
import { Badge, Button, Card, ConfirmDialog } from '@/components/ui'
import type { ImportPreview, ImportStrategy, MovieTrackerExport } from '@/types/export'

export function DataManagementPage() {
  const entries = useLibraryStore((s) => s.entries)
  const watchRecords = useLibraryStore((s) => s.watchRecords)
  const ratings = useRatingsStore((s) => s.ratings)
  const lists = useListsStore((s) => s.lists)
  const syncsToDrive = isGoogleConfigured() && Boolean(getAccount())

  const [importBundle, setImportBundle] = useState<MovieTrackerExport | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<ImportStrategy>('merge')
  const [confirmImportOpen, setConfirmImportOpen] = useState(false)
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [wiping, setWiping] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const libraryCount = Object.keys(entries).length
  // Nothing local to lose - merge and replace produce the identical result,
  // so asking which one is pointless friction.
  const isLocalDataEmpty = libraryCount === 0 && watchRecords.length === 0 && Object.keys(ratings).length === 0 && lists.length === 0

  async function handleFile(file: File) {
    setImportError(null)
    setImportBundle(null)
    setImportPreview(null)
    try {
      const bundle = parseImportBundle(await file.text())
      setImportBundle(bundle)
      setImportPreview(buildImportPreview(bundle))
    } catch (e) {
      setImportError(e instanceof ImportValidationError ? e.message : 'Dosya okunamadı.')
    }
  }

  async function confirmImport(strategyOverride?: ImportStrategy) {
    if (!importBundle) return
    setImporting(true)
    try {
      await applyImport(importBundle, strategyOverride ?? strategy)
      toast({ title: 'İçe aktarma tamamlandı', description: `${importPreview?.counts.libraryEntries ?? 0} içerik yüklendi.`, variant: 'success' })
      setImportBundle(null)
      setImportPreview(null)
    } catch {
      toast({ title: 'İçe aktarma başarısız oldu', variant: 'danger' })
    } finally {
      setImporting(false)
    }
  }

  function handleImportClick() {
    if (isLocalDataEmpty) {
      void confirmImport('merge')
      return
    }
    setConfirmImportOpen(true)
  }

  async function handleWipe() {
    setWiping(true)
    try {
      await deleteAllData()
      toast({ title: 'Tüm verin silindi', description: syncsToDrive ? 'Diğer cihazların da açıldıklarında temizlenecek.' : undefined })
    } catch (e) {
      toast({
        title: 'Silinemedi',
        description: e instanceof DeleteAllError ? e.message : 'Google Drive’a ulaşılamadı. Hiçbir şey silinmedi, tekrar dene.',
        variant: 'danger',
      })
    } finally {
      setWiping(false)
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8 py-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Veri Yönetimi</h1>
        {syncsToDrive && (
          <p className="mt-1 text-sm text-text-muted">
            Verin zaten Google Drive’ında tutuluyor ve cihazların arasında eşitleniyor. Buradakiler, kendi elinde bir kopya
            istediğin ya da başka bir yerden veri getirdiğin durumlar için.
          </p>
        )}
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-text">
          <Download className="h-4 w-4 text-accent" /> Dışa Aktar
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Kitaplık" value={libraryCount} />
          <Stat label="İzleme kaydı" value={watchRecords.length} />
          <Stat label="Puan" value={Object.keys(ratings).length} />
          <Stat label="Liste" value={lists.length} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportAsJSON(buildExportBundle())}>
            <Download className="h-4 w-4" /> JSON olarak indir
          </Button>
          <Button variant="outline" onClick={() => exportAsCSV(buildExportBundle())}>
            <Download className="h-4 w-4" /> CSV olarak indir
          </Button>
        </div>
        <p className="text-xs text-text-subtle">
          JSON dosyası her şeyi içerir (profil, kitaplık, izleme geçmişi, puanlar, notlar, listeler, ayarlar) ve geri yükleme
          için kullanılır. CSV, kitaplığının basit bir tablo görünümüdür.
        </p>
        <p className="flex items-start gap-2 text-xs text-warning">
          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Kendi TMDB anahtarını girdiysen JSON dosyasına da dahil edilir - bu dosyayı kimseyle paylaşma.
        </p>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-text">
          <Upload className="h-4 w-4 text-accent" /> Dosyadan İçe Aktar
        </h2>

        <div
          role="button"
          tabIndex={0}
          aria-label="Yedek dosyası seç"
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) void handleFile(file)
          }}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center transition-colors focus-visible:border-accent ${
            dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-text-subtle'
          }`}
        >
          <Upload className="h-6 w-6 text-text-subtle" />
          <p className="text-sm text-text-muted">Movie Tracker JSON dosyanı buraya sürükle ya da seçmek için dokun</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
          />
        </div>

        {importError && (
          <p className="flex items-center gap-2 text-sm text-danger">
            <AlertTriangle className="h-4 w-4" /> {importError}
          </p>
        )}

        {importPreview && (
          <div className="flex flex-col gap-4 rounded-md border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-text">
                Yedek · {new Date(importBundle!.exportedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {importPreview.containsApiKey && <Badge variant="warning">TMDB anahtarı içeriyor</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Kitaplık" value={importPreview.counts.libraryEntries} />
              <Stat label="İzleme kaydı" value={importPreview.counts.watchRecords} />
              <Stat label="Bölüm ilerlemesi" value={importPreview.counts.episodeProgress} />
              <Stat label="Puan" value={importPreview.counts.ratings} />
            </div>
            {isLocalDataEmpty ? (
              <p className="text-sm text-text-subtle">Kitaplığın şu an boş, bu dosya doğrudan içe aktarılacak.</p>
            ) : (
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">İçe aktarma şekli</legend>
                <label className="flex items-start gap-2 text-sm text-text">
                  <input type="radio" className="mt-1" checked={strategy === 'merge'} onChange={() => setStrategy('merge')} />
                  <span>
                    Birleştir
                    <span className="block text-xs text-text-subtle">
                      Dosyada olup burada olmayanları ve dosyadaki daha yeni sürümleri ekler. Hiçbir şey silinmez.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-text">
                  <input type="radio" className="mt-1" checked={strategy === 'replace'} onChange={() => setStrategy('replace')} />
                  <span>
                    Yerine geç
                    <span className="block text-xs text-text-subtle">Verin tamamen dosyadakiyle değişir, dosyada olmayanlar silinir.</span>
                  </span>
                </label>
              </fieldset>
            )}
            <Button onClick={handleImportClick} disabled={importing} loading={importing} className="self-start">
              İçe Aktar
            </Button>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4 border-danger/30 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-danger">
          <Trash2 className="h-4 w-4" /> Tüm Verimi Sil
        </h2>
        <p className="text-sm text-text-muted">
          {syncsToDrive
            ? 'Kitaplığın, izleme geçmişin, puanların, notların, listelerin ve ayarların bu cihazdan ve Google Drive’ından - dolayısıyla tüm cihazlarından - kalıcı olarak silinir. Hesabın bağlı kalır.'
            : 'Bu tarayıcıdaki tüm Movie Tracker verin kalıcı olarak silinir.'}
        </p>
        <Button variant="danger" onClick={() => setConfirmWipeOpen(true)} loading={wiping} disabled={wiping} className="self-start">
          <Trash2 className="h-4 w-4" /> Tüm verimi sil
        </Button>
      </Card>

      <ConfirmDialog
        open={confirmImportOpen}
        onOpenChange={setConfirmImportOpen}
        title={strategy === 'replace' ? 'Verin dosyadakiyle değiştirilsin mi?' : 'Dosya birleştirilsin mi?'}
        description={
          strategy === 'replace'
            ? 'Dosyada olmayan her şey silinir. Değişiklik tüm cihazlarına da yansır.'
            : 'Dosyadaki eksik ve daha yeni kayıtlar verine eklenecek.'
        }
        destructive={strategy === 'replace'}
        confirmLabel="Devam et"
        onConfirm={() => void confirmImport()}
      />

      <ConfirmDialog
        open={confirmWipeOpen}
        onOpenChange={setConfirmWipeOpen}
        title="Tüm verin silinsin mi?"
        description={
          syncsToDrive
            ? 'Bu cihazdan, Google Drive’dan ve diğer tüm cihazlarından silinir. Bu işlem geri alınamaz.'
            : 'Bu tarayıcıdaki Movie Tracker verilerin kalıcı olarak silinir. Bu işlem geri alınamaz.'
        }
        confirmLabel="Her şeyi sil"
        extraAction={{ label: 'Önce dışa aktar', onClick: () => exportAsJSON(buildExportBundle()) }}
        onConfirm={() => void handleWipe()}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-surface-2 p-3">
      <p className="font-mono text-lg font-semibold text-text">{value}</p>
      <p className="text-xs text-text-subtle">{label}</p>
    </div>
  )
}
