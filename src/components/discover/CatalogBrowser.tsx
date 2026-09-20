import { useEffect, useState } from 'react'
import { movieService, tvService } from '@/services'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { Button, ErrorState, RailSkeleton } from '@/components/ui'
import { MediaRail } from '@/components/media/MediaRail'
import { MediaGrid } from '@/components/media/MediaGrid'
import { DiscoverFilters } from './DiscoverFilters'
import { DEFAULT_FILTERS, toDiscoverParams, type FilterState } from './filterTypes'
import { ROUTES } from '@/utils/routes'
import type { MediaType, MediaSummary } from '@/types/media'

interface MoviePools {
  trending: MediaSummary[]
  popular: MediaSummary[]
  topRated: MediaSummary[]
  nowPlaying: MediaSummary[]
  upcoming: MediaSummary[]
}
interface ShowPools {
  trending: MediaSummary[]
  popular: MediaSummary[]
  topRated: MediaSummary[]
  onTheAir: MediaSummary[]
}

interface CatalogBrowserProps {
  title: string
  lockedType?: MediaType
}

export function CatalogBrowser({ title, lockedType }: CatalogBrowserProps) {
  const baseFilters: FilterState = { ...DEFAULT_FILTERS, type: lockedType ?? 'all' }
  const [filters, setFilters] = useState<FilterState>(baseFilters)
  const [movies, setMovies] = useState<MoviePools | null>(null)
  const [shows, setShows] = useState<ShowPools | null>(null)
  const [error, setError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    setError(false)
    const tasks: Promise<unknown>[] = []
    if (lockedType !== 'tv') {
      tasks.push(
        Promise.all([
          movieService.getTrending(),
          movieService.getPopular(),
          movieService.getTopRated(),
          movieService.getNowPlaying(),
          movieService.getUpcoming(),
        ]).then(([trending, popular, topRated, nowPlaying, upcoming]) => {
          setMovies({ trending, popular, topRated, nowPlaying, upcoming })
          useMediaCacheStore.getState().cache([...trending, ...popular, ...topRated, ...nowPlaying, ...upcoming])
        }),
      )
    }
    if (lockedType !== 'movie') {
      tasks.push(
        Promise.all([tvService.getTrending(), tvService.getPopular(), tvService.getTopRated(), tvService.getOnTheAir()]).then(
          ([trending, popular, topRated, onTheAir]) => {
            setShows({ trending, popular, topRated, onTheAir })
            useMediaCacheStore.getState().cache([...trending, ...popular, ...topRated, ...onTheAir])
          },
        ),
      )
    }
    Promise.all(tasks).catch(() => setError(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lockedType is fixed per page instance
  }, [retryToken])

  const loaded = (lockedType !== 'tv' ? movies !== null : true) && (lockedType !== 'movie' ? shows !== null : true)
  const isFiltering = JSON.stringify(filters) !== JSON.stringify(baseFilters)

  // The default (unfiltered) view just shows a first page of each fixed
  // TMDB list (trending/popular/...) - fine for that, but genre/year/rating
  // filters need a real, paginated search instead of narrowing that same
  // small, already-fetched pool (which is how this used to work, and why
  // picking a genre surfaced almost nothing with no way to see more).
  const [filterItems, setFilterItems] = useState<MediaSummary[]>([])
  const [filterPage, setFilterPage] = useState(1)
  const [filterHasMore, setFilterHasMore] = useState(true)
  const [filterLoading, setFilterLoading] = useState(false)
  const [filterLoadingMore, setFilterLoadingMore] = useState(false)
  const [filterError, setFilterError] = useState(false)
  const [filterRetryToken, setFilterRetryToken] = useState(0)

  async function fetchFilterPage(page: number): Promise<MediaSummary[]> {
    const params = toDiscoverParams(filters)
    const tasks: Promise<MediaSummary[]>[] = []
    if (filters.type !== 'tv') tasks.push(movieService.discover(params, page))
    if (filters.type !== 'movie') tasks.push(tvService.discover(params, page))
    const results = await Promise.all(tasks)
    return results.flat()
  }

  useEffect(() => {
    if (!isFiltering) return
    let cancelled = false
    setFilterLoading(true)
    setFilterError(false)
    setFilterItems([])
    setFilterPage(1)
    setFilterHasMore(true)
    fetchFilterPage(1)
      .then((results) => {
        if (cancelled) return
        setFilterItems(results)
        setFilterHasMore(results.length > 0)
        useMediaCacheStore.getState().cache(results)
      })
      .catch(() => {
        if (!cancelled) setFilterError(true)
      })
      .finally(() => {
        if (!cancelled) setFilterLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch whenever the filter criteria themselves (or filterRetryToken) change
  }, [isFiltering, filters, filterRetryToken])

  async function loadMoreFiltered() {
    if (filterLoadingMore) return
    setFilterLoadingMore(true)
    try {
      const nextPage = filterPage + 1
      const results = await fetchFilterPage(nextPage)
      setFilterItems((prev) => {
        const seen = new Set(prev.map((i) => i.id))
        return [...prev, ...results.filter((i) => !seen.has(i.id))]
      })
      setFilterPage(nextPage)
      setFilterHasMore(results.length > 0)
      useMediaCacheStore.getState().cache(results)
    } catch {
      // Leave existing results in place - the button stays put so the user can just try again.
    } finally {
      setFilterLoadingMore(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">{title}</h1>
        <DiscoverFilters value={filters} onChange={setFilters} />
      </div>

      {isFiltering ? (
        filterError && filterItems.length === 0 ? (
          <ErrorState onRetry={() => setFilterRetryToken((t) => t + 1)} />
        ) : filterLoading ? (
          <RailSkeleton />
        ) : (
          <>
            <MediaGrid items={filterItems} />
            {filterHasMore && filterItems.length > 0 && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={loadMoreFiltered} loading={filterLoadingMore} disabled={filterLoadingMore}>
                  Daha Fazla Yükle
                </Button>
              </div>
            )}
          </>
        )
      ) : error ? (
        <ErrorState onRetry={() => setRetryToken((t) => t + 1)} />
      ) : !loaded ? (
        <RailSkeleton />
      ) : (
        <>
          {movies && (
            <>
              <MediaRail title="Bu Hafta Trend Filmler" seeAllPath={ROUTES.catalogList('movie', 'trending')} items={movies.trending} />
              <MediaRail title="Popüler Filmler" seeAllPath={ROUTES.catalogList('movie', 'popular')} items={movies.popular} />
              <MediaRail title="En Çok Beğenilen Filmler" seeAllPath={ROUTES.catalogList('movie', 'topRated')} items={movies.topRated} />
              <MediaRail title="Yeni Vizyona Girenler" seeAllPath={ROUTES.catalogList('movie', 'nowPlaying')} items={movies.nowPlaying} />
              <MediaRail title="Yakında" seeAllPath={ROUTES.catalogList('movie', 'upcoming')} items={movies.upcoming} />
            </>
          )}
          {shows && (
            <>
              <MediaRail title="Bu Hafta Trend Diziler" seeAllPath={ROUTES.catalogList('tv', 'trending')} items={shows.trending} />
              <MediaRail title="Popüler Diziler" seeAllPath={ROUTES.catalogList('tv', 'popular')} items={shows.popular} />
              <MediaRail title="En Çok Beğenilen Diziler" seeAllPath={ROUTES.catalogList('tv', 'topRated')} items={shows.topRated} />
              <MediaRail title="Yayında Olanlar" seeAllPath={ROUTES.catalogList('tv', 'onTheAir')} items={shows.onTheAir} />
            </>
          )}
        </>
      )}
    </div>
  )
}
