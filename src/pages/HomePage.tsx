import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Clapperboard, Compass, Film, Sparkles } from 'lucide-react'
import { useLibraryStore } from '@/store/libraryStore'
import { useRatingsStore } from '@/store/ratingsStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { useProfileStore } from '@/store/profileStore'
import { fetchQuery, queries, useQuery } from '@/services'
import { getNextEpisode, getSeasonCompletion } from '@/utils/progress'
import { toSummary } from '@/utils/media'
import { inferFavoriteGenres, recommendMedia } from '@/utils/recommend'
import { computeQuickStats, formatWatchTime } from '@/utils/stats'
import { getLastActivityMap } from '@/utils/activity'
import { genreName } from '@/data/genres'
import { ROUTES } from '@/utils/routes'
import { Badge, Button, ErrorState, RailSkeleton } from '@/components/ui'
import { MediaRail } from '@/components/media/MediaRail'
import { ContinueWatchingCard } from '@/components/media/ContinueWatchingCard'
import { StatCard } from '@/components/stats/StatCard'
import type { Episode, MediaSummary, TVShowDetail } from '@/types/media'

interface ContinueItem {
  summary: MediaSummary
  nextEpisode: Episode
  percent: number
}

function useContinueWatching(): ContinueItem[] | null {
  const entries = useLibraryStore((s) => s.entries)
  const episodeProgress = useLibraryStore((s) => s.episodeProgress)
  const [details, setDetails] = useState<TVShowDetail[] | null>(null)

  const watchingIds = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.mediaType === 'tv' && e.status === 'watching')
        .map((e) => e.mediaId),
    [entries],
  )
  const idsKey = watchingIds.join(',')

  // Show details (with every season's episodes) only when the set of shows
  // changes - served from the query cache, so usually instantly. Marking an
  // episode only recomputes the list below; it doesn't refetch anything.
  useEffect(() => {
    let cancelled = false
    if (watchingIds.length === 0) {
      setDetails([])
      return
    }
    Promise.all(watchingIds.map((id) => fetchQuery(queries.showDetail(id)).catch(() => null))).then((all) => {
      if (!cancelled) setDetails(all.filter((d): d is TVShowDetail => Boolean(d)))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey is watchingIds' identity by value
  }, [idsKey])

  return useMemo(() => {
    if (!details) return null
    // Until a changed set of shows has loaded, never show one that's no
    // longer being watched.
    const current = new Set(watchingIds)
    const results: ContinueItem[] = []
    for (const detail of details) {
      if (!current.has(detail.id)) continue
      const next = getNextEpisode(detail.seasons, episodeProgress)
      if (!next) continue
      const season = detail.seasons.find((s) => s.seasonNumber === next.seasonNumber)
      const completion = season ? getSeasonCompletion(season, episodeProgress) : { percent: 0 }
      results.push({ summary: toSummary(detail), nextEpisode: next, percent: completion.percent })
    }
    return results
  }, [details, episodeProgress, watchingIds])
}

export function HomePage() {
  const entries = useLibraryStore((s) => s.entries)
  const watchRecords = useLibraryStore((s) => s.watchRecords)
  const episodeProgress = useLibraryStore((s) => s.episodeProgress)
  const ratings = useRatingsStore((s) => s.ratings)
  const mediaCache = useMediaCacheStore((s) => s.items)
  const profile = useProfileStore((s) => s.profile)

  const trendingMovies = useQuery(queries.movieList('trending'))
  const trendingShows = useQuery(queries.tvList('trending'))
  const trending = useMemo(
    () => (trendingMovies.data && trendingShows.data ? [...trendingMovies.data.slice(0, 8), ...trendingShows.data.slice(0, 4)] : null),
    [trendingMovies.data, trendingShows.data],
  )
  const trendingError = Boolean(trendingMovies.error || trendingShows.error)
  const continueWatching = useContinueWatching()

  const recentlyWatched = useMemo(() => {
    const combined = [...getLastActivityMap(watchRecords, episodeProgress).entries()]
      .map(([mediaId, at]) => ({ mediaId, at }))
      .sort((a, b) => b.at.localeCompare(a.at))

    const seen = new Set<string>()
    const result: MediaSummary[] = []
    for (const activity of combined) {
      if (seen.has(activity.mediaId)) continue
      const summary = mediaCache[activity.mediaId]
      if (!summary) continue
      seen.add(activity.mediaId)
      result.push(summary)
      if (result.length >= 12) break
    }
    return result
  }, [watchRecords, episodeProgress, mediaCache])

  const recentlyAdded = useMemo(() => {
    return Object.values(entries)
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      .map((e) => mediaCache[e.mediaId])
      .filter((s): s is MediaSummary => Boolean(s))
      .slice(0, 12)
  }, [entries, mediaCache])

  const watchlist = useMemo(() => {
    return Object.values(entries)
      .filter((e) => e.status === 'planned')
      .sort((a, b) => (a.watchlistOrder ?? 0) - (b.watchlistOrder ?? 0))
      .map((e) => mediaCache[e.mediaId])
      .filter((s): s is MediaSummary => Boolean(s))
      .slice(0, 12)
  }, [entries, mediaCache])

  const favoriteGenreIds = useMemo(() => {
    const watchedSummaries = watchRecords.map((r) => mediaCache[r.mediaId]).filter((s): s is MediaSummary => Boolean(s))
    const ratingMap = Object.fromEntries(Object.entries(ratings).map(([id, r]) => [id, r.value]))
    const inferred = inferFavoriteGenres(watchedSummaries, ratingMap)
    return profile.favoriteGenreIds.length > 0 ? profile.favoriteGenreIds : inferred
  }, [watchRecords, mediaCache, ratings, profile.favoriteGenreIds])

  const recommended = useMemo(() => {
    if (!trending) return []
    const excludeIds = new Set(Object.keys(entries))
    const pool = new Map<string, MediaSummary>()
    for (const item of [...Object.values(mediaCache), ...trending]) pool.set(item.id, item)
    return recommendMedia({ pool: [...pool.values()], excludeIds, favoriteGenreIds, limit: 12 })
  }, [trending, mediaCache, entries, favoriteGenreIds])

  const stats = useMemo(
    () => computeQuickStats({ entries, watchRecords, episodeProgress, ratings }),
    [entries, watchRecords, episodeProgress, ratings],
  )

  const hasAnyLibraryActivity = Object.keys(entries).length > 0

  if (!hasAnyLibraryActivity && continueWatching?.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 px-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-accent">
          <Film className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text">Film yolculuğun burada başlıyor</h1>
          <p className="mx-auto max-w-md text-text-muted">
            Henüz izlediğin ya da takip ettiğin bir şey yok. Keşfet&apos;ten bir şeyler bul, işaretlemeye başla; kişisel panelin
            burada oluşacak.
          </p>
        </div>
        <Button asChild>
          <Link to={ROUTES.discover}>
            <Compass className="h-4 w-4" /> Keşfet
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10 py-6">
      {continueWatching && continueWatching.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-text">Devam Et</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {continueWatching.map((item) => (
              <ContinueWatchingCard key={item.summary.id} summary={item.summary} nextEpisode={item.nextEpisode} percent={item.percent} />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Film" value={stats.moviesWatched} icon={Clapperboard} />
        <StatCard label="Bölüm" value={stats.episodesWatched} icon={Film} />
        <StatCard label="İzleme süresi" value={formatWatchTime(stats.totalWatchMinutes)} icon={BarChart3} />
        <StatCard label="Ort. puan" value={stats.averageRating ? stats.averageRating.toFixed(1) : '—'} icon={Sparkles} />
      </div>

      <MediaRail
        title="Son İzlenenler"
        seeAllPath={ROUTES.library}
        items={recentlyWatched}
        emptyState={<EmptyRail text="Henüz bir şey izlemedin." />}
      />

      <MediaRail
        title="İzleme Listen"
        seeAllPath={ROUTES.watchlist}
        items={watchlist}
        emptyState={<EmptyRail text="İzleme listen boş." linkPath={ROUTES.discover} linkLabel="Keşfetmeye başla" />}
      />

      <MediaRail title="Son Eklenenler" seeAllPath={ROUTES.library} items={recentlyAdded} emptyState={<EmptyRail text="Kitaplığın henüz boş." />} />

      {favoriteGenreIds.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-text">Favori Türlerin</h2>
          <div className="flex flex-wrap gap-2">
            {favoriteGenreIds.slice(0, 6).map((id) => (
              <Badge key={id} variant="accent">
                {genreName(id)}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <MediaRail
        title="Senin İçin Önerilenler"
        items={recommended}
        emptyState={<EmptyRail text="Öneri üretmek için birkaç şey izlemen yeterli." />}
      />

      {trendingError ? (
        <ErrorState
          title="Popüler içerikler yüklenemedi"
          description="Bağlantında bir sorun olabilir. Kaydedilmiş kitaplığın güvende."
          onRetry={() => {
            trendingMovies.refetch()
            trendingShows.refetch()
          }}
        />
      ) : trending === null ? (
        <RailSkeleton />
      ) : (
        <MediaRail title="Bu Hafta Popüler" seeAllPath={ROUTES.discover} items={trending} emptyState={<EmptyRail text="Şu an popüler içerik yok." />} />
      )}
    </div>
  )
}

function EmptyRail({ text, linkPath, linkLabel }: { text: string; linkPath?: string; linkLabel?: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-text-subtle">
      {text}
      {linkPath && linkLabel && (
        <Link to={linkPath} className="ml-1 font-medium text-accent hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}
