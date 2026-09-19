import { useMemo } from 'react'
import { Heart, User } from 'lucide-react'
import { useLibraryStore } from '@/store/libraryStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { EmptyState } from '@/components/ui'
import { MediaGrid } from '@/components/media/MediaGrid'
import type { MediaSummary } from '@/types/media'

export function FavoritesPage() {
  const entries = useLibraryStore((s) => s.entries)
  const mediaCache = useMediaCacheStore((s) => s.items)

  const favoriteMovies = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.isFavorite && e.mediaType === 'movie')
        .map((e) => mediaCache[e.mediaId])
        .filter((s): s is MediaSummary => Boolean(s)),
    [entries, mediaCache],
  )
  const favoriteShows = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.isFavorite && e.mediaType === 'tv')
        .map((e) => mediaCache[e.mediaId])
        .filter((s): s is MediaSummary => Boolean(s)),
    [entries, mediaCache],
  )

  return (
    <div className="flex flex-col gap-8 py-6">
      <h1 className="text-2xl font-bold text-text">Favoriler</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Favori Filmler</h2>
        {favoriteMovies.length === 0 ? (
          <EmptyState icon={Heart} title="Henüz favori film yok" description="Bir film sayfasındaki kalp ikonuna dokun." />
        ) : (
          <MediaGrid items={favoriteMovies} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Favori Diziler</h2>
        {favoriteShows.length === 0 ? (
          <EmptyState icon={Heart} title="Henüz favori dizi yok" description="Bir dizi sayfasındaki kalp ikonuna dokun." />
        ) : (
          <MediaGrid items={favoriteShows} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Favori Oyuncu ve Yönetmenler</h2>
        <EmptyState icon={User} title="Yakında" description="Kişi sayfaları ve favori oyuncu/yönetmen takibi yol haritasında." />
      </section>
    </div>
  )
}
