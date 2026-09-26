import { useRef, type ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import { prefetchQuery, queries } from '@/services'
import { ROUTES } from '@/utils/routes'
import type { MediaType } from '@/types/media'

type DetailLinkProps = Omit<ComponentProps<typeof Link>, 'to'> & {
  mediaId: string
  mediaType: MediaType
  /** Appended to the path, e.g. "?continue=s1e3". */
  search?: string
}

/** Resting on a card this long with a mouse counts as intent; just
 * sweeping across a rail doesn't. */
const HOVER_INTENT_MS = 120

/**
 * A link into a movie or show page that starts loading it on intent -
 * pointer down (the tap itself lands ~100 ms later), a resting mouse, or
 * keyboard focus - so the page usually opens already filled in.
 */
export function DetailLink({ mediaId, mediaType, search = '', onPointerDown, onPointerEnter, onPointerLeave, onFocus, ...rest }: DetailLinkProps) {
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>()
  const path = (mediaType === 'movie' ? ROUTES.movieDetail(mediaId) : ROUTES.showDetail(mediaId)) + search
  const prefetch = () => {
    if (mediaType === 'movie') prefetchQuery(queries.movieDetail(mediaId))
    else prefetchQuery(queries.showDetail(mediaId))
  }

  return (
    <Link
      to={path}
      onPointerDown={(e) => {
        prefetch()
        onPointerDown?.(e)
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') hoverTimer.current = setTimeout(prefetch, HOVER_INTENT_MS)
        onPointerEnter?.(e)
      }}
      onPointerLeave={(e) => {
        clearTimeout(hoverTimer.current)
        onPointerLeave?.(e)
      }}
      onFocus={(e) => {
        prefetch()
        onFocus?.(e)
      }}
      {...rest}
    />
  )
}
