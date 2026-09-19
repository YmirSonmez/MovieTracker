import { tmdbFetch } from './client'
import { mapMovieDetail, mapMovieSummary } from './mappers'
import type { TMDBMovieDetail, TMDBPaginated, TMDBMovieSummary } from './types'
import type { MediaSummary, MovieDetail } from '@/types/media'

function extractId(mediaId: string): number {
  return Number(mediaId.replace('movie-', ''))
}

export async function fetchPopularMovies(page = 1): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBMovieSummary>>('/movie/popular', { page })
  return data.results.map(mapMovieSummary)
}

export async function fetchTopRatedMovies(page = 1): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBMovieSummary>>('/movie/top_rated', { page })
  return data.results.map(mapMovieSummary)
}

export async function fetchTrendingMovies(): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBMovieSummary>>('/trending/movie/week')
  return data.results.map(mapMovieSummary)
}

export async function fetchUpcomingMovies(page = 1): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBMovieSummary>>('/movie/upcoming', { page })
  return data.results.map(mapMovieSummary)
}

export async function fetchNowPlayingMovies(page = 1): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBMovieSummary>>('/movie/now_playing', { page })
  return data.results.map(mapMovieSummary)
}

export async function fetchMovieDetail(mediaId: string): Promise<MovieDetail> {
  const raw = await tmdbFetch<TMDBMovieDetail>(`/movie/${extractId(mediaId)}`, {
    append_to_response: 'credits,similar,recommendations',
  })
  return mapMovieDetail(raw)
}
