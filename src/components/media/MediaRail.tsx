import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MediaSummary } from '@/types/media'
import { MediaCard } from './MediaCard'

interface MediaRailProps {
  title: string
  seeAllPath?: string
  items: MediaSummary[]
  emptyState?: ReactNode
  subtitleFor?: (item: MediaSummary) => ReactNode
}

export function MediaRail({ title, seeAllPath, items, emptyState, subtitleFor }: MediaRailProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {seeAllPath && items.length > 0 && (
          <Link to={seeAllPath} className="flex items-center gap-0.5 text-sm font-medium text-text-muted hover:text-accent">
            Tümünü gör
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {items.length === 0
        ? emptyState
        : (
          <div className="rail-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {items.map((item) => (
              <div key={item.id} className="w-[140px] shrink-0 sm:w-[160px]">
                <MediaCard summary={item} subtitle={subtitleFor?.(item)} />
              </div>
            ))}
          </div>
        )}
    </section>
  )
}
