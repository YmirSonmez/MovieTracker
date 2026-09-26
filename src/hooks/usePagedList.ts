import { useState } from 'react'
import { fetchQuery, useQuery, type QueryDef } from '@/services/queryCache'
import type { MediaSummary } from '@/types/media'

/** Pages 2+ of each list ("Daha Fazla Yükle"), remembered for the session:
 * coming back to a list shows everything that was loaded before, at the
 * same length - which is also what lets the scroll position be restored. */
const extraPages = new Map<string, MediaSummary[][]>()

function dedupe(items: MediaSummary[]): MediaSummary[] {
  const seen = new Set<string>()
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id))
}

/**
 * A "load more" list on top of the query cache: page 1 is a cached query
 * (instant when seen before, refreshed in the background), later pages are
 * fetched through the same cache and appended.
 */
export function usePagedList(listKey: string | null, pageQuery: (page: number) => QueryDef<MediaSummary[]>) {
  const first = useQuery(listKey ? pageQuery(1) : null)
  const [more, setMore] = useState<MediaSummary[][]>(() => (listKey ? (extraPages.get(listKey) ?? []) : []))
  const [trackedKey, setTrackedKey] = useState(listKey)
  const [loadingMore, setLoadingMore] = useState(false)

  // A different list in the same component (a filter changed): start over
  // from whatever this session already loaded for that one.
  if (trackedKey !== listKey) {
    setTrackedKey(listKey)
    setMore(listKey ? (extraPages.get(listKey) ?? []) : [])
  }

  const pages = first.data ? [first.data, ...more] : []
  const lastPage = pages[pages.length - 1]

  async function loadMore() {
    if (!listKey || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await fetchQuery(pageQuery(more.length + 2))
      const next = [...(extraPages.get(listKey) ?? more), page]
      extraPages.set(listKey, next)
      setMore(next)
    } catch {
      // Existing results stay; the button stays so the user can try again.
    } finally {
      setLoadingMore(false)
    }
  }

  return {
    items: dedupe(pages.flat()),
    isLoading: first.isLoading,
    error: first.error,
    refetch: first.refetch,
    hasMore: Boolean(lastPage && lastPage.length > 0),
    loadMore,
    loadingMore,
  }
}
