import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, List } from 'lucide-react'
import { useLibraryStore } from '@/store/libraryStore'
import { useRatingsStore } from '@/store/ratingsStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { getLastActivityMap } from '@/utils/activity'
import { Button, EmptyState, Select, Tabs, TabsList, TabsTrigger } from '@/components/ui'
import { MediaGrid } from '@/components/media/MediaGrid'
import { MediaListRow } from '@/components/media/MediaListRow'
import { ROUTES } from '@/utils/routes'
import { Library as LibraryIcon } from 'lucide-react'
import type { LibraryEntry, WatchStatus } from '@/types/watch'
import type { MediaSummary } from '@/types/media'

type TabKey = 'all' | 'movie' | 'tv' | 'watching' | 'completed' | 'planned' | 'dropped' | 'favorites'
type SortKey = 'addedDesc' | 'watchedDesc' | 'alpha' | 'releaseDesc' | 'ratingDesc' | 'runtimeDesc'

const TABS: { value: TabKey; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'movie', label: 'Filmler' },
  { value: 'tv', label: 'Diziler' },
  { value: 'watching', label: 'İzleniyor' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'planned', label: 'Planlandı' },
  { value: 'dropped', label: 'Bırakıldı' },
  { value: 'favorites', label: 'Favoriler' },
]

function matchesTab(entry: LibraryEntry, tab: TabKey): boolean {
  if (tab === 'all') return true
  if (tab === 'movie' || tab === 'tv') return entry.mediaType === tab
  if (tab === 'favorites') return entry.isFavorite
  return entry.status === tab
}

export function LibraryPage() {
  const entries = useLibraryStore((s) => s.entries)
  const watchRecords = useLibraryStore((s) => s.watchRecords)
  const episodeProgress = useLibraryStore((s) => s.episodeProgress)
  const ratings = useRatingsStore((s) => s.ratings)
  const mediaCache = useMediaCacheStore((s) => s.items)

  const [tab, setTab] = useState<TabKey>('all')
  const [sort, setSort] = useState<SortKey>('addedDesc')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const allEntries = Object.values(entries)
  const movieCount = allEntries.filter((e) => e.mediaType === 'movie').length
  const showCount = allEntries.filter((e) => e.mediaType === 'tv').length

  const activityMap = useMemo(() => getLastActivityMap(watchRecords, episodeProgress), [watchRecords, episodeProgress])

  const filtered = useMemo(() => {
    const list = allEntries
      .filter((e) => matchesTab(e, tab))
      .map((entry) => ({ entry, summary: mediaCache[entry.mediaId] }))
      .filter((row): row is { entry: LibraryEntry; summary: MediaSummary } => Boolean(row.summary))

    const withSortKey = list.map((row) => ({
      ...row,
      rating: ratings[row.entry.mediaId]?.value ?? 0,
      watchedAt: activityMap.get(row.entry.mediaId) ?? '',
    }))

    withSortKey.sort((a, b) => {
      switch (sort) {
        case 'alpha':
          return a.summary.title.localeCompare(b.summary.title, 'tr')
        case 'releaseDesc':
          return (b.summary.year ?? 0) - (a.summary.year ?? 0)
        case 'ratingDesc':
          return b.rating - a.rating
        case 'runtimeDesc':
          return (b.summary.runtimeMinutes ?? 0) - (a.summary.runtimeMinutes ?? 0)
        case 'watchedDesc':
          return b.watchedAt.localeCompare(a.watchedAt)
        default:
          return b.entry.addedAt.localeCompare(a.entry.addedAt)
      }
    })

    return withSortKey
  }, [allEntries, tab, sort, mediaCache, ratings, activityMap])

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Kitaplığım</h1>
          <p className="text-sm text-text-subtle">
            {allEntries.length} içerik · {movieCount} film · {showCount} dizi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            size="sm"
            value={sort}
            onValueChange={(v) => setSort(v as SortKey)}
            options={[
              { value: 'addedDesc', label: 'Son Eklenen' },
              { value: 'watchedDesc', label: 'Son İzlenen' },
              { value: 'alpha', label: 'Alfabetik' },
              { value: 'releaseDesc', label: 'Yayın Tarihi' },
              { value: 'ratingDesc', label: 'Puanım' },
              { value: 'runtimeDesc', label: 'Süre' },
            ]}
          />
          <div className="flex items-center rounded-full border border-border p-1">
            <button
              type="button"
              aria-label="Izgara görünümü"
              onClick={() => setView('grid')}
              className={`rounded-full p-1.5 ${view === 'grid' ? 'bg-accent text-accent-foreground' : 'text-text-subtle'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Liste görünümü"
              onClick={() => setView('list')}
              className={`rounded-full p-1.5 ${view === 'list' ? 'bg-accent text-accent-foreground' : 'text-text-subtle'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={LibraryIcon}
          title="Burada henüz bir şey yok"
          description="Keşfet'ten bir film ya da dizi bulup kitaplığına ekleyebilirsin."
          action={
            <Button asChild>
              <Link to={ROUTES.discover}>Keşfet</Link>
            </Button>
          }
        />
      ) : view === 'grid' ? (
        <MediaGrid items={filtered.map((row) => row.summary)} />
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((row) => (
            <MediaListRow
              key={row.entry.id}
              summary={row.summary}
              status={row.entry.status as WatchStatus | undefined}
              isFavorite={row.entry.isFavorite}
              rating={row.rating}
            />
          ))}
        </div>
      )}
    </div>
  )
}
