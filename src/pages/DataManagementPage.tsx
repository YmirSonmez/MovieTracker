import { useRef, useState } from 'react'
import { AlertTriangle, CloudDownload, CloudUpload, Download, KeyRound, Sparkles, Trash2, Upload } from 'lucide-react'
import { useLibraryStore } from '@/store/libraryStore'
import { useRatingsStore } from '@/store/ratingsStore'
import { useListsStore } from '@/store/listsStore'
import { useCloudSyncStore } from '@/store/cloudSyncStore'
import { loadDemoData, clearDemoData } from '@/data/demoSeed'
import { toast } from '@/store/toastStore'
import { backupToDrive, restoreFromDrive, isGoogleDriveConfigured, GoogleDriveError } from '@/services/googleDrive'
import {
  buildExportBundle,
  buildImportPreview,
  exportAsCSV,
  exportAsJSON,
  applyImport,
  parseImportBundle,
  ImportValidationError,
} from '@/utils/exportImport'
import { Badge, Button, Card, ConfirmDialog } from '@/components/ui'
import type { ImportPreview, ImportStrategy, MovieTrackerExport } from '@/types/export'

export function DataManagementPage() {
  const entries = useLibraryStore((s) => s.entries)
  const watchRecords = useLibraryStore((s) => s.watchRecords)
  const ratings = useRatingsStore((s) => s.ratings)
  const lists = useListsStore((s) => s.lists)
  const lastSyncedAt = useCloudSyncStore((s) => s.meta.lastSyncedAt)
  const driveConfigured = isGoogleDriveConfigured()

  const [importBundle, setImportBundle] = useState<MovieTrackerExport | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSource, setImportSource] = useState<'file' | 'drive'>('file')
  const [strategy, setStrategy] = useState<ImportStrategy>('merge')
  const [confirmImportOpen, setConfirmImportOpen] = useState(false)
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [drivePending, setDrivePending] = useState<'backup' | 'restore' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const libraryCount = Object.keys(entries).length
  const isLibraryEmpty = libraryCount === 0

  async function handleFile(file: File) {
    setImportError(null)
    setImportBundle(null)
    setImportPreview(null)
    setImportSource('file')
    try {
      const text = await file.text()
      const bundle = parseImportBundle(text)
      setImportBundle(bundle)
      setImportPreview(buildImportPreview(bundle))
    } catch (e) {
      setImportError(e instanceof ImportValidationError ? e.message : 'Dosya okunamadı.')
    }
  }

  async function confirmImport() {
    if (!importBundle) return
    setImporting(true)
    try {
      await applyImport(importBundle, strategy)
      toast({ title: 'İçe aktarma tamamlandı', description: `${importPreview?.counts.libraryEntries ?? 0} içerik yüklendi.`, variant: 'success' })
      setImportBundle(null)
      setImportPreview(null)
    } catch {
      toast({ title: 'İçe aktarma başarısız oldu', variant: 'danger' })
    } finally {
      setImporting(false)
    }
  }

  async function handleDriveBackup() {
    setDrivePending('backup')
    try {
      const result = await backupToDrive()
      if ('conflict' in result) {
        // This device has never reconciled with Drive before, and a backup
        // already exists there (from another device) - pushing over it
        // blind would destroy it. Show the same merge/replace preview the
        // "Drive'dan Geri Yükle" button uses, so the user decides first.
        const { bundle, preview } = await restoreFromDrive()
        setImportSource('drive')
        setImportBundle(bundle)
        setImportPreview(preview)
        toast({ title: 'Drive’da zaten bir yedeğin var', description: 'Üzerine yazılmadı - önce aşağıdaki yedeği incele.' })
      } else {
        toast({ title: 'Google Drive’a yedeklendi', variant: 'success' })
      }
    } catch (e) {
      toast({ title: 'Yedekleme başarısız oldu', description: e instanceof GoogleDriveError ? e.message : undefined, variant: 'danger' })
    } finally {
      setDrivePending(null)
    }
  }

  async function handleDriveRestore() {
    setDrivePending('restore')
    setImportError(null)
    try {
      const { bundle, preview } = await restoreFromDrive()
      setImportSource('drive')
      setImportBundle(bundle)
      setImportPreview(preview)
    } catch (e) {
      toast({ title: 'Geri yükleme başarısız oldu', description: e instanceof GoogleDriveError ? e.message : undefined, variant: 'danger' })
    } finally {
      setDrivePending(null)
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8 py-6">
      <h1 className="text-2xl font-bold text-text">Veri Yönetimi</h1>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-text">
          <Download className="h-4 w-4 text-accent" /> Verini Dışa Aktar
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
          JSON dosyası her şeyi içerir (profil, kitaplık, izleme geçmişi, puanlar, notlar, listeler, ayarlar) ve tam yedek/geri
          yükleme için kullanılır. CSV, kitaplığının basit bir tablo görünümüdür.
        </p>
        <p className="flex items-start gap-2 text-xs text-warning">
          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Kendi TMDB anahtarını girdiysen JSON dosyasına da dahil edilir - bu dosyayı kimseyle paylaşma veya herkese açık bir
          depoya yükleme.
        </p>
      </Card>

      {driveConfigured && (
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-text">
            <CloudUpload className="h-4 w-4 text-accent" /> Google Drive Yedekleme
          </h2>
          <p className="text-sm text-text-muted">
            Verilerini kendi Google Drive hesabındaki tek bir dosyaya (yalnızca bu uygulamanın erişebildiği) yedekle ya da oradan
            geri yükle. Hiçbir veri bizim bir sunucumuzdan geçmez. Bir kere bağlandıktan sonra her değişiklik bu oturum boyunca
            otomatik olarak yedeklenir - aşağıdaki düğmeler yalnızca elle bir seferlik işlem için gerekir.
          </p>
          {lastSyncedAt && (
            <p className="text-xs text-text-subtle">Son yedekleme: {new Date(lastSyncedAt).toLocaleString('tr-TR')}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleDriveBackup} loading={drivePending === 'backup'} disabled={drivePending !== null}>
              <CloudUpload className="h-4 w-4" /> Şimdi Yedekle
            </Button>
            <Button variant="outline" onClick={handleDriveRestore} loading={drivePending === 'restore'} disabled={drivePending !== null}>
              <CloudDownload className="h-4 w-4" /> Drive'dan Geri Yükle
            </Button>
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-text">
          <Upload className="h-4 w-4 text-accent" /> Yedekten Geri Yükle
        </h2>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center transition-colors ${
            dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-text-subtle'
          }`}
        >
          <Upload className="h-6 w-6 text-text-subtle" />
          <p className="text-sm text-text-muted">Yedek dosyanı buraya sürükle ya da seçmek için tıkla</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
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
              <p className="text-sm font-medium text-text">Yedek tespit edildi · Sürüm {importPreview.version}</p>
              <Badge variant="neutral">{importSource === 'drive' ? 'Google Drive' : 'Dosya'}</Badge>
              {importPreview.containsApiKey && <Badge variant="warning">TMDB anahtarı içeriyor</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Kitaplık" value={importPreview.counts.libraryEntries} />
              <Stat label="İzleme kaydı" value={importPreview.counts.watchRecords} />
              <Stat label="Bölüm ilerlemesi" value={importPreview.counts.episodeProgress} />
              <Stat label="Puan" value={importPreview.counts.ratings} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-text">
                <input type="radio" checked={strategy === 'merge'} onChange={() => setStrategy('merge')} />
                Mevcut verilerimle birleştir
              </label>
              <label className="flex items-center gap-2 text-sm text-text">
                <input type="radio" checked={strategy === 'replace'} onChange={() => setStrategy('replace')} />
                Mevcut tüm verimin yerine geç
              </label>
            </div>
            <Button onClick={() => setConfirmImportOpen(true)} disabled={importing} loading={importing} className="self-start">
              İçe Aktar
            </Button>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-text">
          <Sparkles className="h-4 w-4 text-accent" /> Örnek Veri
        </h2>
        <p className="text-sm text-text-muted">
          Uygulamanın nasıl göründüğünü görmek için örnek bir izleme geçmişi, puanlar ve listeler yükle. Yalnızca kitaplığın
          boşken kullanılabilir.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!isLibraryEmpty}
            onClick={async () => {
              await loadDemoData()
              toast({ title: 'Örnek veri yüklendi', variant: 'success' })
            }}
          >
            Örnek Veri Yükle
          </Button>
          {!isLibraryEmpty && <p className="self-center text-xs text-text-subtle">Kitaplığın dolu olduğu için devre dışı.</p>}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 border-danger/30 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-danger">
          <Trash2 className="h-4 w-4" /> Tehlikeli Bölge
        </h2>
        <p className="text-sm text-text-muted">
          Bu tarayıcıdaki tüm Movie Tracker verini kalıcı olarak siler: kitaplık, izleme geçmişi, puanlar, notlar, listeler ve
          ayarlar. Önce dışa aktarmanı öneririz.
        </p>
        <Button variant="danger" onClick={() => setConfirmWipeOpen(true)} className="self-start">
          <Trash2 className="h-4 w-4" /> Tüm Yerel Veriyi Sil
        </Button>
      </Card>

      <ConfirmDialog
        open={confirmImportOpen}
        onOpenChange={setConfirmImportOpen}
        title={strategy === 'replace' ? 'Mevcut verinin yerine geçilsin mi?' : 'Veriler birleştirilsin mi?'}
        description={
          strategy === 'replace'
            ? 'Bu, şu anki tüm yerel verini geri dönüşü olmayan şekilde siler ve yedekteki veriyle değiştirir.'
            : 'İçe aktarılan kayıtlar mevcut kitaplığınla birleştirilecek.'
        }
        destructive={strategy === 'replace'}
        confirmLabel="Devam Et"
        onConfirm={confirmImport}
      />

      <ConfirmDialog
        open={confirmWipeOpen}
        onOpenChange={setConfirmWipeOpen}
        title="Tüm yerel verin silinsin mi?"
        description="Bu, bu tarayıcıdaki Movie Tracker verilerini kalıcı olarak kaldırır. Bu işlem geri alınamaz."
        confirmLabel="Verimi Sil"
        extraAction={{ label: 'Önce Dışa Aktar', onClick: () => exportAsJSON(buildExportBundle()) }}
        onConfirm={async () => {
          await clearDemoData()
          toast({ title: 'Tüm yerel veri silindi' })
        }}
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
