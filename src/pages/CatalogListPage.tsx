import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getCatalogCategory } from '@/utils/catalogCategories'
import { usePagedList } from '@/hooks/usePagedList'
import { Button, ErrorState, PosterCardSkeleton } from '@/components/ui'
import { MediaGrid } from '@/components/media/MediaGrid'
import { ROUTES } from '@/utils/routes'

/**
 * The full, paginated view behind every rail's "Tümünü gör" link on
 * Discover/Filmler/Diziler - a rail only ever shows a first page's worth of
 * titles, so this is the only place a visitor can page past that.
 */
export function CatalogListPage() {
  const { mediaType, category } = useParams<{ mediaType: string; category: string }>()
  const entry = getCatalogCategory(mediaType, category)
  const { items, isLoading, error, refetch, hasMore, loadMore, loadingMore } = usePagedList(
    entry ? `catalog:${mediaType}:${category}` : null,
    (page) => entry!.page(page),
  )

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

      {error ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
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
              <Button variant="outline" onClick={() => void loadMore()} loading={loadingMore} disabled={loadingMore}>
                Daha Fazla Yükle
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
