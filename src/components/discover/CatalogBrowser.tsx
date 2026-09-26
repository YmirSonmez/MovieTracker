import { useSearchParams } from 'react-router-dom'
import { queries, useQuery, type QueryDef } from '@/services'
import { Button, ErrorState, RailSkeleton } from '@/components/ui'
import { MediaRail } from '@/components/media/MediaRail'
import { MediaGrid } from '@/components/media/MediaGrid'
import { usePagedList } from '@/hooks/usePagedList'
import { DiscoverFilters } from './DiscoverFilters'
import { DEFAULT_FILTERS, toDiscoverParams, type FilterState } from './filterTypes'
import { ROUTES } from '@/utils/routes'
import type { MediaType, MediaSummary } from '@/types/media'

interface CatalogBrowserProps {
  title: string
  lockedType?: MediaType
}

const SORTS: FilterState['sort'][] = ['popularity', 'rating', 'year']

/** Filters live in the URL (?genre=18&year=2020...) rather than component
 * state, so opening a title and coming back returns to the same filtered
 * list instead of resetting it. */
function readFilters(params: URLSearchParams, lockedType?: MediaType): FilterState {
  const type = params.get('type')
  const sort = params.get('sort') as FilterState['sort'] | null
  return {
    type: lockedType ?? (type === 'movie' || type === 'tv' ? type : 'all'),
    genreId: params.get('genre') ?? DEFAULT_FILTERS.genreId,
    year: params.get('year') ?? DEFAULT_FILTERS.year,
    minRating: params.get('rating') ?? DEFAULT_FILTERS.minRating,
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
  }
}

function writeFilters(filters: FilterState, lockedType?: MediaType): URLSearchParams {
  const params = new URLSearchParams()
  if (!lockedType && filters.type !== DEFAULT_FILTERS.type) params.set('type', filters.type)
  if (filters.genreId !== DEFAULT_FILTERS.genreId) params.set('genre', filters.genreId)
  if (filters.year !== DEFAULT_FILTERS.year) params.set('year', filters.year)
  if (filters.minRating !== DEFAULT_FILTERS.minRating) params.set('rating', filters.minRating)
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort)
  return params
}

/** One rail, loading on its own - each appears as soon as its own list is
 * ready (instantly when cached) instead of all waiting for the slowest. */
function QueryRail({ title, seeAllPath, query }: { title: string; seeAllPath: string; query: QueryDef<MediaSummary[]> }) {
  const { data, error, isLoading, refetch } = useQuery(query)
  if (isLoading) {
    return (
      <section className="flex flex-col gap-3" aria-busy="true">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <RailSkeleton />
      </section>
    )
  }
  if (error) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <p className="flex items-center gap-3 text-sm text-text-muted">
          Yüklenemedi.
          <Button variant="outline" size="sm" onClick={refetch}>
            Tekrar dene
          </Button>
        </p>
      </section>
    )
  }
  return <MediaRail title={title} seeAllPath={seeAllPath} items={data ?? []} />
}

export function CatalogBrowser({ title, lockedType }: CatalogBrowserProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readFilters(searchParams, lockedType)
  const baseFilters: FilterState = { ...DEFAULT_FILTERS, type: lockedType ?? 'all' }
  const isFiltering = JSON.stringify(filters) !== JSON.stringify(baseFilters)

  // The default (unfiltered) view shows the first page of each fixed TMDB
  // list; genre/year/rating filters need a real, paginated search instead.
  const params = toDiscoverParams(filters)
  const filtered = usePagedList(isFiltering ? `discover:${filters.type}:${JSON.stringify(params)}` : null, (page) =>
    queries.discover(filters.type, params, page),
  )

  return (
    <div className="flex flex-col gap-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">{title}</h1>
        <DiscoverFilters value={filters} onChange={(next) => setSearchParams(writeFilters(next, lockedType), { replace: true })} />
      </div>

      {isFiltering ? (
        filtered.error ? (
          <ErrorState onRetry={filtered.refetch} />
        ) : filtered.isLoading ? (
          <RailSkeleton />
        ) : (
          <>
            <MediaGrid items={filtered.items} />
            {filtered.hasMore && filtered.items.length > 0 && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => void filtered.loadMore()} loading={filtered.loadingMore} disabled={filtered.loadingMore}>
                  Daha Fazla Yükle
                </Button>
              </div>
            )}
          </>
        )
      ) : (
        <>
          {lockedType !== 'tv' && (
            <>
              <QueryRail title="Bu Hafta Trend Filmler" seeAllPath={ROUTES.catalogList('movie', 'trending')} query={queries.movieList('trending')} />
              <QueryRail title="Popüler Filmler" seeAllPath={ROUTES.catalogList('movie', 'popular')} query={queries.movieList('popular')} />
              <QueryRail title="En Çok Beğenilen Filmler" seeAllPath={ROUTES.catalogList('movie', 'topRated')} query={queries.movieList('topRated')} />
              <QueryRail title="Yeni Vizyona Girenler" seeAllPath={ROUTES.catalogList('movie', 'nowPlaying')} query={queries.movieList('nowPlaying')} />
              <QueryRail title="Yakında" seeAllPath={ROUTES.catalogList('movie', 'upcoming')} query={queries.movieList('upcoming')} />
            </>
          )}
          {lockedType !== 'movie' && (
            <>
              <QueryRail title="Bu Hafta Trend Diziler" seeAllPath={ROUTES.catalogList('tv', 'trending')} query={queries.tvList('trending')} />
              <QueryRail title="Popüler Diziler" seeAllPath={ROUTES.catalogList('tv', 'popular')} query={queries.tvList('popular')} />
              <QueryRail title="En Çok Beğenilen Diziler" seeAllPath={ROUTES.catalogList('tv', 'topRated')} query={queries.tvList('topRated')} />
              <QueryRail title="Yayında Olanlar" seeAllPath={ROUTES.catalogList('tv', 'onTheAir')} query={queries.tvList('onTheAir')} />
            </>
          )}
        </>
      )}
    </div>
  )
}
