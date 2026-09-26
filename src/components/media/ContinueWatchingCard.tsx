import { Play } from 'lucide-react'
import type { MediaSummary, Episode } from '@/types/media'
import { Card, ProgressBar } from '@/components/ui'
import { DetailLink } from './DetailLink'

interface ContinueWatchingCardProps {
  summary: MediaSummary
  nextEpisode: Episode
  percent: number
}

export function ContinueWatchingCard({ summary, nextEpisode, percent }: ContinueWatchingCardProps) {
  const continueSearch = `?continue=s${nextEpisode.seasonNumber}e${nextEpisode.episodeNumber}`

  return (
    <Card className="flex gap-4 p-3">
      <DetailLink mediaId={summary.id} mediaType="tv" search={continueSearch} className="block w-20 shrink-0 overflow-hidden rounded-sm sm:w-24">
        <div className="aspect-2/3 w-full bg-surface-2">
          {summary.posterPath && <img src={summary.posterPath} alt="" className="h-full w-full object-cover" />}
        </div>
      </DetailLink>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="min-w-0">
          <DetailLink mediaId={summary.id} mediaType="tv" search={continueSearch} className="block truncate font-semibold text-text hover:text-accent">
            {summary.title}
          </DetailLink>
          <p className="mt-0.5 font-mono text-xs text-text-subtle">
            S{nextEpisode.seasonNumber} E{String(nextEpisode.episodeNumber).padStart(2, '0')}
          </p>
          <p className="truncate text-sm text-text-muted">{nextEpisode.name}</p>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <ProgressBar percent={percent} className="flex-1" label={`${summary.title} ilerlemesi`} />
          <span className="shrink-0 font-mono text-xs text-text-subtle">%{percent}</span>
        </div>
      </div>
      <DetailLink
        mediaId={summary.id}
        mediaType="tv"
        search={continueSearch}
        aria-label={`${summary.title} - devam et`}
        className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full bg-accent text-accent-foreground transition-transform active:scale-95"
      >
        <Play className="h-4 w-4" fill="currentColor" />
      </DetailLink>
    </Card>
  )
}
