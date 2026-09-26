import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MediaSummary } from '@/types/media'
import { PosterCardSkeleton } from '@/components/ui'
import { MediaCard } from './MediaCard'

interface MediaRailProps {
  title: string
  seeAllPath?: string
  items: MediaSummary[]
  emptyState?: ReactNode
  subtitleFor?: (item: MediaSummary) => ReactNode
}

/** Cards rendered straight away - more than a wide screen shows at once. */
const FIRST_CARDS = 8
/** How far outside the viewport a rail starts mounting its cards. */
const NEAR_VIEWPORT = 600

/** A rail's real rendered height at each card size (140px / 160px wide).
 * Placeholders use exactly this, so the page is the same height before and
 * after a rail mounts - which keeps scroll restoration exact. */
const RAIL_HEIGHT = 'h-[304px] sm:h-[334px]'

function isNearViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.bottom > -NEAR_VIEWPORT && rect.top < window.innerHeight + NEAR_VIEWPORT
}

/** True once the element has come within NEAR_VIEWPORT of the screen, and
 * stays true. Decided before the first paint for rails already on screen,
 * so those never flash a placeholder. */
function useNearViewport<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [near, setNear] = useState(false)

  useLayoutEffect(() => {
    if (ref.current && isNearViewport(ref.current)) setNear(true)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (near || !el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true)
      },
      { rootMargin: `${NEAR_VIEWPORT}px 0px` },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [near])

  return [ref, near]
}

/** The first few cards now, the rest once the browser is genuinely idle -
 * or right away if the user starts swiping the rail. A rail shows two or
 * three cards on a phone, so the other seventeen shouldn't hold up the
 * page, nor land on the main thread while the user is tapping. */
function RailCards({ items, subtitleFor }: Pick<MediaRailProps, 'items' | 'subtitleFor'>) {
  const [showAll, setShowAll] = useState(items.length <= FIRST_CARDS)

  useEffect(() => {
    if (showAll) return
    const run = () => setShowAll(true)
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run)
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(run, 300)
    return () => clearTimeout(id)
  }, [showAll])

  return (
    <div
      className="rail-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2"
      onScroll={showAll ? undefined : () => setShowAll(true)}
      onFocusCapture={showAll ? undefined : () => setShowAll(true)}
    >
      {(showAll ? items : items.slice(0, FIRST_CARDS)).map((item) => (
        <div key={item.id} className="w-[140px] shrink-0 sm:w-[160px]">
          <MediaCard summary={item} subtitle={subtitleFor?.(item)} />
        </div>
      ))}
    </div>
  )
}

export const MediaRail = memo(function MediaRail({ title, seeAllPath, items, emptyState, subtitleFor }: MediaRailProps) {
  const [ref, near] = useNearViewport<HTMLElement>()

  const header = (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {seeAllPath && items.length > 0 && (
        <Link to={seeAllPath} className="flex items-center gap-0.5 text-sm font-medium text-text-muted hover:text-accent">
          Tümünü gör
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )

  if (items.length === 0) {
    return (
      <section ref={ref} className="flex flex-col gap-3">
        {header}
        {emptyState}
      </section>
    )
  }

  // Far off screen: an exact-height stand-in (Discover stacks nine rails,
  // ~180 cards - mounting them all at once is most of that page's cost).
  if (!near) {
    return (
      <section ref={ref} aria-busy="true" className={`flex flex-col gap-3 overflow-hidden ${RAIL_HEIGHT}`}>
        {header}
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-[140px] shrink-0 sm:w-[160px]">
              <PosterCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} className="flex flex-col gap-3">
      {header}
      <RailCards items={items} subtitleFor={subtitleFor} />
    </section>
  )
})
