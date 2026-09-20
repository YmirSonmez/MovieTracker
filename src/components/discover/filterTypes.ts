import type { DiscoverParams, MediaType } from '@/types/media'

export interface FilterState {
  type: MediaType | 'all'
  genreId: string
  year: string
  minRating: string
  sort: 'popularity' | 'rating' | 'year'
}

export const DEFAULT_FILTERS: FilterState = { type: 'all', genreId: 'all', year: 'all', minRating: 'all', sort: 'popularity' }

/** FilterState's fields are strings (an 'all' sentinel binds cleanly to
 * <Select>); DiscoverParams' are numbers|undefined (what the API layer
 * actually wants). This is the one place that conversion happens. */
export function toDiscoverParams(filters: FilterState): DiscoverParams {
  return {
    genreId: filters.genreId !== 'all' ? Number(filters.genreId) : undefined,
    year: filters.year !== 'all' ? Number(filters.year) : undefined,
    minRating: filters.minRating !== 'all' ? Number(filters.minRating) : undefined,
    sort: filters.sort,
  }
}
