import { useMemo, useState } from 'react'
import { Bookmark, Check, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react'
import { useLibraryStore } from '@/store/libraryStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { useLibraryActions } from '@/hooks/useLibraryActions'
import { toast } from '@/store/toastStore'
import { Button, Card, EmptyState, Select, Textarea } from '@/components/ui'
import { DetailLink } from '@/components/media/DetailLink'
import type { LibraryEntry, WatchlistPriority } from '@/types/watch'
import type { MediaSummary } from '@/types/media'

type TypeFilter = 'all' | 'movie' | 'tv'

const PRIORITY_LABEL: Record<WatchlistPriority, string> = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' }
const PRIORITY_WEIGHT: Record<WatchlistPriority, number> = { high: 0, medium: 1, low: 2 }

function WatchlistRow({
  entry,
  summary,
  onMove,
  isFirst,
  isLast,
}: {
  entry: LibraryEntry
  summary: MediaSummary
  onMove: (direction: 'up' | 'down') => void
  isFirst: boolean
  isLast: boolean
}) {
  const { markWatched, removeFromWatchlist } = useLibraryActions()
  const [editingNote, setEditingNote] = useState(false)
  const [note, setNote] = useState(entry.watchlistNote ?? '')

  return (
    <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
      <DetailLink mediaId={summary.id} mediaType={summary.mediaType} className="h-24 w-16 shrink-0 overflow-hidden rounded-sm bg-surface-2">
        {summary.posterPath && <img src={summary.posterPath} alt="" className="h-full w-full object-cover" />}
      </DetailLink>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <DetailLink mediaId={summary.id} mediaType={summary.mediaType} className="font-medium text-text hover:text-accent">
              {summary.title}
            </DetailLink>
            <p className="text-xs text-text-subtle">{summary.year ?? '—'}</p>
          </div>
          <Select
            size="sm"
            value={entry.watchlistPriority ?? 'medium'}
            onValueChange={(v) => useLibraryStore.getState().addToWatchlist(entry.mediaId, entry.mediaType, v as WatchlistPriority, entry.watchlistNote)}
            options={(['high', 'medium', 'low'] as WatchlistPriority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
          />
        </div>

        {editingNote ? (
          <div className="flex flex-col gap-2">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Kısa bir not (opsiyonel)" aria-label="Not" />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  await useLibraryStore.getState().addToWatchlist(entry.mediaId, entry.mediaType, entry.watchlistPriority, note.trim())
                  setEditingNote(false)
                }}
              >
                Kaydet
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingNote(false)}>
                Vazgeç
              </Button>
            </div>
          </div>
        ) : entry.watchlistNote ? (
          <button type="button" onClick={() => setEditingNote(true)} className="flex items-start gap-1.5 text-left text-sm text-text-muted hover:text-text">
            <Pencil className="mt-0.5 h-3 w-3 shrink-0" /> {entry.watchlistNote}
          </button>
        ) : (
          <button type="button" onClick={() => setEditingNote(true)} className="w-fit text-sm text-accent hover:underline">
            + Not ekle
          </button>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" onClick={() => markWatched(summary)}>
            <Check className="h-3.5 w-3.5" /> İzledim
          </Button>
          <Button size="sm" variant="ghost" onClick={() => removeFromWatchlist(summary)}>
            <X className="h-3.5 w-3.5" /> Kaldır
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" aria-label="Yukarı taşı" disabled={isFirst} onClick={() => onMove('up')}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Aşağı taşı" disabled={isLast} onClick={() => onMove('down')}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function WatchlistPage() {
  const entries = useLibraryStore((s) => s.entries)
  const mediaCache = useMediaCacheStore((s) => s.items)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortByPriority, setSortByPriority] = useState(false)

  const watchlistEntries = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.status === 'planned')
        .filter((e) => typeFilter === 'all' || e.mediaType === typeFilter)
        .sort((a, b) => {
          if (sortByPriority) {
            const diff = PRIORITY_WEIGHT[a.watchlistPriority ?? 'medium'] - PRIORITY_WEIGHT[b.watchlistPriority ?? 'medium']
            if (diff !== 0) return diff
          }
          return (a.watchlistOrder ?? 0) - (b.watchlistOrder ?? 0)
        }),
    [entries, typeFilter, sortByPriority],
  )

  const allWatchlist = Object.values(entries).filter((e) => e.status === 'planned')
  const movieCount = allWatchlist.filter((e) => e.mediaType === 'movie').length
  const showCount = allWatchlist.filter((e) => e.mediaType === 'tv').length

  function moveItem(mediaId: string, direction: 'up' | 'down') {
    const orderedIds = watchlistEntries.map((e) => e.mediaId)
    const index = orderedIds.indexOf(mediaId)
    const swapWith = direction === 'up' ? index - 1 : index + 1
    if (swapWith < 0 || swapWith >= orderedIds.length) return
    ;[orderedIds[index], orderedIds[swapWith]] = [orderedIds[swapWith], orderedIds[index]]
    useLibraryStore.getState().reorderWatchlist(orderedIds)
    toast({ title: 'Sıralama güncellendi' })
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-text">İzleme Listesi</h1>
        <p className="text-sm text-text-subtle">
          {movieCount} film ve {showCount} dizi bekliyor
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'movie', 'tv'] as TypeFilter[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              typeFilter === t ? 'bg-accent text-accent-foreground' : 'bg-surface-2 text-text-muted hover:text-text'
            }`}
          >
            {t === 'all' ? 'Tümü' : t === 'movie' ? 'Filmler' : 'Diziler'}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSortByPriority((v) => !v)}
          className={`ml-auto rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            sortByPriority ? 'bg-accent text-accent-foreground' : 'bg-surface-2 text-text-muted hover:text-text'
          }`}
        >
          Önceliğe göre sırala
        </button>
      </div>

      {watchlistEntries.length === 0 ? (
        <EmptyState icon={Bookmark} title="Bekleyen bir şey yok" description="İzleme listen boş. Keşfet'ten bir şeyler ekle." />
      ) : (
        <div className="flex flex-col gap-3">
          {watchlistEntries.map((entry, i) => {
            const summary = mediaCache[entry.mediaId]
            if (!summary) return null
            return (
              <WatchlistRow
                key={entry.id}
                entry={entry}
                summary={summary}
                isFirst={i === 0}
                isLast={i === watchlistEntries.length - 1}
                onMove={(dir) => moveItem(entry.mediaId, dir)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
