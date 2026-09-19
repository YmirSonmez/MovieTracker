import { useEffect, useMemo, useState } from 'react'
import { movieService, tvService } from '@/services'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { ErrorState, RailSkeleton } from '@/components/ui'
import { MediaRail } from '@/components/media/MediaRail'
import { MediaGrid } from '@/components/media/MediaGrid'
import { DiscoverFilters } from './DiscoverFilters'
import { DEFAULT_FILTERS, type FilterState } from './filterTypes'
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

  const filteredResults = useMemo(() => {
    if (!loaded) return []
    let pool: MediaSummary[] = []
    if (filters.type !== 'tv' && movies) pool = pool.concat(movies.trending, movies.popular, movies.topRated, movies.nowPlaying, movies.upcoming)
    if (filters.type !== 'movie' && shows) pool = pool.concat(shows.trending, shows.popular, shows.topRated, shows.onTheAir)
    const deduped = [...new Map(pool.map((i) => [i.id, i])).values()]
    let result = deduped
    if (filters.genreId !== 'all') result = result.filter((i) => i.genreIds.includes(Number(filters.genreId)))
    if (filters.year !== 'all') result = result.filter((i) => i.year === Number(filters.year))
    if (filters.minRating !== 'all') result = result.filter((i) => (i.voteAverage ?? 0) >= Number(filters.minRating))
    if (filters.sort === 'rating') result = [...result].sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))
    if (filters.sort === 'year') result = [...result].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    return result
  }, [loaded, movies, shows, filters])

  return (
    <div className="flex flex-col gap-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">{title}</h1>
        <DiscoverFilters value={filters} onChange={setFilters} />
      </div>

      {error ? (
        <ErrorState onRetry={() => setRetryToken((t) => t + 1)} />
      ) : !loaded ? (
        <RailSkeleton />
      ) : isFiltering ? (
        <MediaGrid items={filteredResults} />
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
