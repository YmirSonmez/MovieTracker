import type { ReactNode } from 'react'
import { Star } from 'lucide-react'

interface DetailHeroProps {
  backdropPath: string | null
  posterPath: string | null
  title: string
  originalTitle?: string
  metaLine: string
  genres: string[]
  voteAverage: number | null
  actions: ReactNode
  statusBadge?: ReactNode
}

export function DetailHero({
  backdropPath,
  posterPath,
  title,
  originalTitle,
  metaLine,
  genres,
  voteAverage,
  actions,
  statusBadge,
}: DetailHeroProps) {
  return (
    <div className="flex flex-col">
      <div className="relative h-56 w-full overflow-hidden rounded-md bg-surface-2 sm:h-72 lg:h-80">
        {backdropPath && <img src={backdropPath} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      </div>

      {/* Backdrop above is `relative`, which makes it a positioned box that
          paints after static siblings regardless of DOM order. This row
          overlaps the backdrop (negative margin) and must also be
          positioned, or its content silently renders underneath it. */}
      <div className="relative -mt-16 flex flex-col gap-4 px-1 sm:-mt-20 sm:flex-row sm:gap-6 sm:px-2">
        <div className="w-32 shrink-0 overflow-hidden rounded-md border-4 border-bg bg-surface-2 shadow-xl sm:w-44">
          <div className="aspect-2/3 w-full">
            {posterPath && <img src={posterPath} alt="" className="h-full w-full object-cover" />}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1 sm:pt-16">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {statusBadge}
              {voteAverage != null && voteAverage > 0 && (
                <span className="flex items-center gap-1 font-mono text-sm text-accent">
                  <Star className="h-4 w-4" fill="currentColor" />
                  {voteAverage.toFixed(1)}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-text sm:text-3xl">{title}</h1>
            {originalTitle && originalTitle !== title && <p className="text-sm text-text-subtle">{originalTitle}</p>}
            <p className="mt-1 text-sm text-text-muted">{metaLine}</p>
            {genres.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <span key={g} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-text-muted">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </div>
      </div>
    </div>
  )
}
