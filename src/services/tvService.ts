import { isLiveDataConfigured } from '@/api/tmdb/client'
import * as tmdb from '@/api/tmdb/tvApi'
import { demoCatalog, getTVDetail as getDemoTVDetail } from '@/data/catalog'
import type { TVShowDetail } from '@/types/media'
import type { TVService } from './types'

function isDemoId(mediaId: string): boolean {
  return mediaId.startsWith('tv-demo-')
}

export const tvService: TVService = {
  async getPopular() {
    return isLiveDataConfigured() ? tmdb.fetchPopularTV() : demoCatalog.tv.popular()
  },
  async getTopRated() {
    return isLiveDataConfigured() ? tmdb.fetchTopRatedTV() : demoCatalog.tv.topRated()
  },
  async getTrending() {
    return isLiveDataConfigured() ? tmdb.fetchTrendingTV() : demoCatalog.tv.trending()
  },
  async getOnTheAir() {
    return isLiveDataConfigured() ? tmdb.fetchOnTheAirTV() : demoCatalog.tv.onTheAir()
  },
  async getDetail(mediaId): Promise<TVShowDetail | null> {
    if (isDemoId(mediaId) || !isLiveDataConfigured()) return getDemoTVDetail(mediaId)
    return tmdb.fetchTVDetail(mediaId)
  },
}
