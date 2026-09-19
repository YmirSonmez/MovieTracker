import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, Search, Trash2, X } from 'lucide-react'
import { searchService } from '@/services'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '@/utils/recentSearches'
import { Avatar, EmptyState, ErrorState, Input, RailSkeleton, Select } from '@/components/ui'
import { MediaGrid } from '@/components/media/MediaGrid'
import type { MediaSummary, Person } from '@/types/media'

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
  const [results, setResults] = useState<{ movies: MediaSummary[]; shows: MediaSummary[]; people: Person[] } | null>(null)
  const [searchError, setSearchError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)
  const debouncedQuery = useDebouncedValue(query.trim(), 300)

  useEffect(() => {
    setRecent(getRecentSearches())
  }, [])

  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null)
      setSearchError(false)
      setSearchParams({}, { replace: true })
      return
    }
    let cancelled = false
    setSearchError(false)
    setResults(null)
    setSearchParams({ q: debouncedQuery }, { replace: true })
    searchService
      .searchAll(debouncedQuery)
      .then((r) => {
        if (cancelled) return
        setResults(r)
        useMediaCacheStore.getState().cache([...r.movies, ...r.shows])
        setRecent(addRecentSearch(debouncedQuery))
      })
      .catch(() => {
        if (!cancelled) setSearchError(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSearchParams identity is stable across renders (React Router)
  }, [debouncedQuery, retryToken])

  const sortedMovies = useMemo(() => sortMediaItems(results?.movies ?? [], sort), [results, sort])
  const sortedShows = useMemo(() => sortMediaItems(results?.shows ?? [], sort), [results, sort])
  const hasQuery = debouncedQuery.length > 0
  const hasAnyResults = (results?.movies.length ?? 0) + (results?.shows.length ?? 0) + (results?.people.length ?? 0) > 0

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Film, dizi veya kişi ara..." className="pl-10" />
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

      {hasQuery && searchError && <ErrorState onRetry={() => setRetryToken((t) => t + 1)} />}

      {hasQuery && !searchError && results === null && <RailSkeleton />}

      {hasQuery && !searchError && results !== null && !hasAnyResults && (
        <EmptyState icon={X} title="Sonuç bulunamadı" description={`"${debouncedQuery}" için bir sonuç bulamadık.`} />
      )}

      {hasQuery && !searchError && results !== null && hasAnyResults && (
        <div className="flex flex-col gap-8">
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
