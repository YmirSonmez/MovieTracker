import { tmdbFetch } from './client'
import type { TMDBGenre } from './types'
import type { Genre, MediaType } from '@/types/media'

let movieGenres: Genre[] | null = null
let tvGenres: Genre[] | null = null

async function fetchGenres(mediaType: MediaType): Promise<Genre[]> {
  const data = await tmdbFetch<{ genres: TMDBGenre[] }>(`/genre/${mediaType}/list`)
  return data.genres
}

export async function getGenres(mediaType: MediaType): Promise<Genre[]> {
  if (mediaType === 'movie') {
    movieGenres ??= await fetchGenres('movie')
    return movieGenres
  }
  tvGenres ??= await fetchGenres('tv')
  return tvGenres
}

export async function genreNamesFor(ids: number[], mediaType: MediaType): Promise<string[]> {
  const genres = await getGenres(mediaType)
  const map = new Map(genres.map((g) => [g.id, g.name]))
  return ids.map((id) => map.get(id)).filter((name): name is string => Boolean(name))
}
