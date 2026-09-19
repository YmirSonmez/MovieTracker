import { tmdbFetch, tmdbImageUrl } from './client'
import { mapMovieSummary, mapTVSummary } from './mappers'
import type { TMDBMultiSearchResult, TMDBPaginated } from './types'
import type { MediaSummary, Person } from '@/types/media'

export interface MultiSearchResults {
  movies: MediaSummary[]
  shows: MediaSummary[]
  people: Person[]
}

export async function searchMulti(query: string): Promise<MultiSearchResults> {
  if (!query.trim()) return { movies: [], shows: [], people: [] }
  const data = await tmdbFetch<TMDBPaginated<TMDBMultiSearchResult>>('/search/multi', {
    query,
    include_adult: 'false',
  })

  const movies: MediaSummary[] = []
  const shows: MediaSummary[] = []
  const people: Person[] = []

  for (const item of data.results) {
    if (item.media_type === 'movie') movies.push(mapMovieSummary(item))
    else if (item.media_type === 'tv') shows.push(mapTVSummary(item))
    else if (item.media_type === 'person') {
      people.push({
        id: `person-${item.id}`,
        name: item.name,
        profilePath: tmdbImageUrl(item.profile_path, 'w185'),
        knownForDepartment: item.known_for_department,
      })
    }
  }

  return { movies, shows, people }
}
