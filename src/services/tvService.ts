import { isLiveDataConfigured } from '@/api/tmdb/client'
import * as tmdb from '@/api/tmdb/tvApi'
import { demoCatalog, getTVDetail as getDemoTVDetail } from '@/data/catalog'
import type { TVShowDetail } from '@/types/media'
import type { TVService } from './types'

function isDemoId(mediaId: string): boolean {
  return mediaId.startsWith('tv-demo-')
}

// The demo catalog is a small, fixed set of titles - it has exactly one
// "page" of results per category. Reporting an empty page 2+ (rather than
// repeating page 1) is what lets a "load more" UI correctly stop offering
// more once that page is reached, instead of looping forever.
function demoPage<T>(items: T[], page: number): T[] {
  return page > 1 ? [] : items
}

export const tvService: TVService = {
  async getPopular(page = 1) {
    return isLiveDataConfigured() ? tmdb.fetchPopularTV(page) : demoPage(demoCatalog.tv.popular(), page)
  },
  async getTopRated(page = 1) {
    return isLiveDataConfigured() ? tmdb.fetchTopRatedTV(page) : demoPage(demoCatalog.tv.topRated(), page)
  },
  async getTrending(page = 1) {
    return isLiveDataConfigured() ? tmdb.fetchTrendingTV(page) : demoPage(demoCatalog.tv.trending(), page)
  },
  async getOnTheAir(page = 1) {
    return isLiveDataConfigured() ? tmdb.fetchOnTheAirTV(page) : demoPage(demoCatalog.tv.onTheAir(), page)
  },
  async getDetail(mediaId): Promise<TVShowDetail | null> {
    if (isDemoId(mediaId) || !isLiveDataConfigured()) return getDemoTVDetail(mediaId)
    return tmdb.fetchTVDetail(mediaId)
  },
}
