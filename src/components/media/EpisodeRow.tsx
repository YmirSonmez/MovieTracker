import { Check } from 'lucide-react'
import { Button, StarRating } from '@/components/ui'
import { useLibraryStore } from '@/store/libraryStore'
import { useRatingsStore } from '@/store/ratingsStore'
import { cn } from '@/utils/cn'
import type { Episode } from '@/types/media'

interface EpisodeRowProps {
  episode: Episode
  highlighted?: boolean
  rowRef?: (el: HTMLDivElement | null) => void
}

export function EpisodeRow({ episode, highlighted, rowRef }: EpisodeRowProps) {
  const watched = useLibraryStore((s) => s.isEpisodeWatched(episode.showId, episode.seasonNumber, episode.episodeNumber))
  const rating = useRatingsStore((s) => s.ratings[episode.id]?.value ?? 0)

  return (
    <div
      ref={rowRef}
      className={cn(
        'flex flex-col gap-3 rounded-md border border-transparent p-3 transition-colors sm:flex-row sm:items-start',
        highlighted && 'border-accent bg-accent/5',
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (watched) {
            useLibraryStore.getState().markEpisodeUnwatched(episode.showId, episode.seasonNumber, episode.episodeNumber)
          } else {
            useLibraryStore
              .getState()
              .markEpisodeWatched(episode.showId, episode.seasonNumber, episode.episodeNumber, undefined, episode.runtime ?? undefined)
          }
        }}
        aria-label={watched ? 'İzlenmedi olarak işaretle' : 'İzlendi olarak işaretle'}
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors',
          watched ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-transparent hover:border-text-subtle',
        )}
      >
        <Check className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-xs text-text-subtle">E{String(episode.episodeNumber).padStart(2, '0')}</span>
          <h4 className="text-sm font-medium text-text">{episode.name}</h4>
          {episode.airDate && <span className="text-xs text-text-subtle">· {new Date(episode.airDate).toLocaleDateString('tr-TR')}</span>}
          {episode.runtime && <span className="text-xs text-text-subtle">· {episode.runtime} dk</span>}
        </div>
        {episode.overview && <p className="mt-1 line-clamp-2 text-xs text-text-muted">{episode.overview}</p>}
        <div className="mt-2">
          <StarRating
            size="sm"
            value={rating}
            onChange={(value) => useRatingsStore.getState().setRating(episode.id, 'tv', value)}
            label={`${episode.name} puanı`}
          />
        </div>
      </div>
    </div>
  )
}

export function SeasonBulkActions({ onMarkSeasonWatched }: { onMarkSeasonWatched: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onMarkSeasonWatched}>
      <Check className="h-3.5 w-3.5" /> Sezonu izledim olarak işaretle
    </Button>
  )
}
