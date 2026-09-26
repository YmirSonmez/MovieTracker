import { DetailLink } from './DetailLink'
import { Star } from 'lucide-react'
import type { MediaSummary } from '@/types/media'
import type { WatchStatus } from '@/types/watch'
import { Badge } from '@/components/ui'

const STATUS_LABEL: Record<WatchStatus, string> = {
  watching: 'İzleniyor',
  completed: 'Tamamlandı',
  planned: 'Planlandı',
  dropped: 'Bırakıldı',
}

const STATUS_VARIANT: Record<WatchStatus, 'accent' | 'success' | 'neutral' | 'danger'> = {
  watching: 'accent',
  completed: 'success',
  planned: 'neutral',
  dropped: 'danger',
}

interface MediaListRowProps {
  summary: MediaSummary
  status?: WatchStatus
  isFavorite?: boolean
  rating?: number
}

export function MediaListRow({ summary, status, isFavorite, rating }: MediaListRowProps) {
  return (
    <DetailLink mediaId={summary.id} mediaType={summary.mediaType} className="flex items-center gap-4 rounded-md p-2 transition-colors hover:bg-surface-2">
      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-surface-2">
        {summary.posterPath && <img src={summary.posterPath} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text">{summary.title}</p>
        <p className="text-xs text-text-subtle">{summary.year ?? '—'}</p>
      </div>
      {rating != null && rating > 0 && (
        <span className="flex items-center gap-1 font-mono text-sm text-accent">
          <Star className="h-3.5 w-3.5" fill="currentColor" /> {rating.toFixed(1)}
        </span>
      )}
      {isFavorite && <Star className="h-4 w-4 shrink-0 text-accent" fill="currentColor" />}
      {status && <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>}
    </DetailLink>
  )
}
