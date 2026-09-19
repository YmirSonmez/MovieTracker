import { Link } from 'react-router-dom'
import { Bookmark, Check, Heart, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MediaSummary } from '@/types/media'
import { useLibraryStore } from '@/store/libraryStore'
import { useLibraryActions } from '@/hooks/useLibraryActions'
import { ROUTES } from '@/utils/routes'
import { cn } from '@/utils/cn'

interface MediaCardProps {
  summary: MediaSummary
  subtitle?: ReactNode
  className?: string
  showQuickActions?: boolean
}

export function MediaCard({ summary, subtitle, className, showQuickActions = true }: MediaCardProps) {
  const entry = useLibraryStore((s) => s.entries[summary.id])
  const { toggleFavorite, addToWatchlist, markWatched } = useLibraryActions()
  const detailPath = summary.mediaType === 'movie' ? ROUTES.movieDetail(summary.id) : ROUTES.showDetail(summary.id)

  return (
    <div className={cn('group flex w-full flex-col gap-2', className)}>
      <Link to={detailPath} className="relative block overflow-hidden rounded-md bg-surface-2">
        <div className="aspect-2/3 w-full">
          {summary.posterPath ? (
            <img
              src={summary.posterPath}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-subtle">{summary.title}</div>
          )}
        </div>

        {entry?.status === 'completed' && (
          <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-success text-white shadow">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}

        {showQuickActions && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">
            <button
              type="button"
              aria-label={entry?.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              onClick={(e) => {
                e.preventDefault()
                toggleFavorite(summary)
              }}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-colors lg:h-8 lg:w-8',
                entry?.isFavorite ? 'bg-accent text-accent-foreground' : 'bg-white/15 text-white hover:bg-white/25',
              )}
            >
              <Heart className="h-4 w-4" fill={entry?.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              aria-label="İzleme listesine ekle"
              onClick={(e) => {
                e.preventDefault()
                addToWatchlist(summary)
              }}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-colors lg:h-8 lg:w-8',
                entry?.status === 'planned' ? 'bg-accent text-accent-foreground' : 'bg-white/15 text-white hover:bg-white/25',
              )}
            >
              <Bookmark className="h-4 w-4" fill={entry?.status === 'planned' ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              aria-label="İzlendi olarak işaretle"
              onClick={(e) => {
                e.preventDefault()
                markWatched(summary)
              }}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-colors lg:h-8 lg:w-8',
                entry?.status === 'completed' ? 'bg-accent text-accent-foreground' : 'bg-white/15 text-white hover:bg-white/25',
              )}
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        )}
      </Link>

      <Link to={detailPath} className="flex flex-col gap-0.5">
        <h3 className="truncate text-sm font-semibold text-text">{summary.title}</h3>
        {subtitle ?? (
          <div className="flex items-center gap-1.5 text-xs text-text-subtle">
            <span>{summary.year ?? '—'}</span>
            {summary.voteAverage != null && summary.voteAverage > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <Star className="h-3 w-3 text-accent" fill="currentColor" />
                <span className="font-mono">{summary.voteAverage.toFixed(1)}</span>
              </>
            )}
          </div>
        )}
      </Link>
    </div>
  )
}
