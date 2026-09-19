import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getCatalogCategory } from '@/utils/catalogCategories'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { Button, ErrorState, PosterCardSkeleton } from '@/components/ui'
import { MediaGrid } from '@/components/media/MediaGrid'
import { ROUTES } from '@/utils/routes'
import type { MediaSummary } from '@/types/media'

/**
 * The full, paginated view behind every rail's "Tümünü gör" link on
 * Discover/Filmler/Diziler - a rail only ever shows a first page's worth of
 * titles, so this is the only place a visitor can page past that.
 */
export function CatalogListPage() {
  const { mediaType, category } = useParams<{ mediaType: string; category: string }>()
  const entry = getCatalogCategory(mediaType, category)

  const [items, setItems] = useState<MediaSummary[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!entry) return
    let cancelled = false
    setItems([])
    setPage(1)
    setHasMore(true)
    setLoading(true)
    setError(false)
    entry
      .fetchPage(1)
      .then((results) => {
        if (cancelled) return
        setItems(results)
        setHasMore(results.length > 0)
        useMediaCacheStore.getState().cache(results)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entry is re-derived fresh from mediaType/category on every render; those two (plus retryToken) are the real deps
  }, [mediaType, category, retryToken])

  async function loadMore() {
    if (!entry || loadingMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const results = await entry.fetchPage(nextPage)
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id))
        return [...prev, ...results.filter((i) => !seen.has(i.id))]
      })
      setPage(nextPage)
      setHasMore(results.length > 0)
      useMediaCacheStore.getState().cache(results)
    } catch {
      // Leave the existing results in place - the button stays put so the user can just try again.
    } finally {
      setLoadingMore(false)
    }
  }

  if (!entry) {
    return (
      <div className="py-6">
        <ErrorState title="Kategori bulunamadı" description="Bu bağlantı artık geçerli değil." />
      </div>
    )
  }

  const backTo = mediaType === 'tv' ? ROUTES.tvShows : mediaType === 'movie' ? ROUTES.movies : ROUTES.discover

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={backTo}>
            <ArrowLeft className="h-4 w-4" /> Geri
          </Link>
        </Button>
        <h1 className="min-w-0 truncate text-2xl font-bold text-text">{entry.title}</h1>
      </div>

      {error && items.length === 0 ? (
        <ErrorState onRetry={() => setRetryToken((t) => t + 1)} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <PosterCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <MediaGrid items={items} />
          {hasMore && items.length > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} loading={loadingMore} disabled={loadingMore}>
                Daha Fazla Yükle
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
