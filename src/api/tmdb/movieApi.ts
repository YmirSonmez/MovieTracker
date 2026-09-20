import { tmdbFetch } from './client'
import { mapMovieDetail, mapMovieSummary } from './mappers'
import type { TMDBMovieDetail, TMDBPaginated, TMDBMovieSummary } from './types'
import type { DiscoverParams, MediaSummary, MovieDetail } from '@/types/media'

const MOVIE_SORT_BY: Record<DiscoverParams['sort'], string> = {
  popularity: 'popularity.desc',
  rating: 'vote_average.desc',
  year: 'primary_release_date.desc',
}

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

export async function fetchTrendingMovies(page = 1): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBMovieSummary>>('/trending/movie/week', { page })
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

/** TMDB's real discover/movie endpoint - the only path that actually
 * supports filtering by genre/year/rating server-side, with real
 * pagination. Everything else in this file is a fixed, pre-defined list
 * (popular/top-rated/etc.); this is the one Discover's own filters use. */
export async function fetchDiscoverMovies(params: DiscoverParams, page = 1): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBMovieSummary>>('/discover/movie', {
    page,
    sort_by: MOVIE_SORT_BY[params.sort],
    with_genres: params.genreId,
    primary_release_year: params.year,
    'vote_average.gte': params.minRating,
  })
  return data.results.map(mapMovieSummary)
}

export async function fetchMovieDetail(mediaId: string): Promise<MovieDetail> {
  const raw = await tmdbFetch<TMDBMovieDetail>(`/movie/${extractId(mediaId)}`, {
    append_to_response: 'credits,similar,recommendations',
  })
  return mapMovieDetail(raw)
}
