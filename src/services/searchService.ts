import { isLiveDataConfigured } from '@/api/tmdb/client'
import { searchMulti } from '@/api/tmdb/searchApi'
import { searchDemoCatalog } from '@/data/catalog'
import type { MultiSearchResults, SearchService } from './types'

export const searchService: SearchService = {
  async searchAll(query): Promise<MultiSearchResults> {
    if (isLiveDataConfigured()) return searchMulti(query)
    const { movies, shows } = searchDemoCatalog(query)
    return { movies, shows, people: [] }
  },
}
