import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, Search, Trash2, X } from 'lucide-react'
import { queries, useQuery } from '@/services'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '@/utils/recentSearches'
import { Avatar, EmptyState, ErrorState, Input, RailSkeleton, Select } from '@/components/ui'
import { MediaGrid } from '@/components/media/MediaGrid'
import type { MediaSummary } from '@/types/media'

type SortOption = 'relevance' | 'rating' | 'year'

function sortMediaItems(items: MediaSummary[], sort: SortOption): MediaSummary[] {
  if (sort === 'rating') return [...items].sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))
  if (sort === 'year') return [...items].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
  return items
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [sort, setSort] = useState<SortOption>('relevance')
  const [recent, setRecent] = useState<string[]>([])
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  // Cached per query for the session: going back to a search, or retyping
  // one, shows its results instantly.
  const search = useQuery(debouncedQuery ? queries.search(debouncedQuery) : null)
  // While the next query loads, keep the previous results on screen (dimmed)
  // instead of flashing back to a skeleton on every keystroke.
  const previous = useRef(search.data ?? null)
  if (search.data) previous.current = search.data
  const refreshing = !search.data && search.isLoading && previous.current !== null
  const results = search.data ?? (refreshing ? previous.current : null)
  const searchError = Boolean(search.error)

  useEffect(() => {
    setRecent(getRecentSearches())
  }, [])

  useEffect(() => {
    setSearchParams(debouncedQuery ? { q: debouncedQuery } : {}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSearchParams identity is stable across renders (React Router)
  }, [debouncedQuery])

  useEffect(() => {
    if (search.data && debouncedQuery) setRecent(addRecentSearch(debouncedQuery))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record a search once its results arrive
  }, [search.data])

  const sortedMovies = useMemo(() => sortMediaItems(results?.movies ?? [], sort), [results, sort])
  const sortedShows = useMemo(() => sortMediaItems(results?.shows ?? [], sort), [results, sort])
  const hasQuery = debouncedQuery.length > 0
  const hasAnyResults = (results?.movies.length ?? 0) + (results?.shows.length ?? 0) + (results?.people.length ?? 0) > 0

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Film, dizi veya kişi ara…"
            aria-label="Film, dizi veya kişi ara"
            className="pl-10"
          />
        </div>
        {hasAnyResults && (
          <Select
            value={sort}
            onValueChange={(v) => setSort(v as SortOption)}
            options={[
              { value: 'relevance', label: 'Alaka düzeyi' },
              { value: 'rating', label: 'Puana göre' },
              { value: 'year', label: 'Yıla göre' },
            ]}
          />
        )}
      </div>

      {!hasQuery && (
        <div className="flex flex-col gap-3">
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm text-text-subtle">
                <Clock className="h-3.5 w-3.5" /> Son aramalar
              </span>
              {recent.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="rounded-full bg-surface-2 px-3 py-1 text-sm text-text-muted transition-colors hover:text-text"
                >
                  {term}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  clearRecentSearches()
                  setRecent([])
                }}
                aria-label="Geçmişi temizle"
                className="text-text-subtle hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <EmptyState icon={Search} title="Aramaya başla" description="Film, dizi ya da kişi adı yazarak keşfetmeye başla." />
        </div>
      )}

      {hasQuery && searchError && <ErrorState onRetry={search.refetch} />}

      {hasQuery && !searchError && results === null && <RailSkeleton />}

      {hasQuery && !searchError && results !== null && !hasAnyResults && (
        <EmptyState icon={X} title="Sonuç bulunamadı" description={`"${debouncedQuery}" için bir sonuç bulamadık.`} />
      )}

      {hasQuery && !searchError && results !== null && hasAnyResults && (
        <div aria-busy={refreshing} className={`flex flex-col gap-8 transition-opacity duration-150 ${refreshing ? 'opacity-60' : ''}`}>
          {sortedMovies.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-text">Filmler</h2>
              <MediaGrid items={sortedMovies} />
            </section>
          )}
          {sortedShows.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-text">Diziler</h2>
              <MediaGrid items={sortedShows} />
            </section>
          )}
          {results.people.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-text">Kişiler</h2>
              <div className="flex flex-wrap gap-4">
                {results.people.map((person) => (
                  <div key={person.id} className="flex w-20 flex-col items-center gap-2 text-center">
                    <Avatar name={person.name} imageUrl={person.profilePath} size="lg" />
                    <p className="truncate text-xs text-text-muted">{person.name}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
