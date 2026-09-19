import type { MediaType } from '@/types/media'

export interface FilterState {
  type: MediaType | 'all'
  genreId: string
  year: string
  minRating: string
  sort: 'popularity' | 'rating' | 'year'
}

export const DEFAULT_FILTERS: FilterState = { type: 'all', genreId: 'all', year: 'all', minRating: 'all', sort: 'popularity' }
