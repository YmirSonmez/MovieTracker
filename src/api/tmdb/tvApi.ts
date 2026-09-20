import { tmdbFetch } from './client'
import { mapSeasonDetail, mapTVDetail, mapTVSummary } from './mappers'
import type { TMDBPaginated, TMDBSeasonDetail, TMDBTVDetail, TMDBTVSummary } from './types'
import type { DiscoverParams, MediaSummary, Season, TVShowDetail } from '@/types/media'

const TV_SORT_BY: Record<DiscoverParams['sort'], string> = {
  popularity: 'popularity.desc',
  rating: 'vote_average.desc',
  year: 'first_air_date.desc',
}

function extractId(mediaId: string): number {
  return Number(mediaId.replace('tv-', ''))
}

export async function fetchPopularTV(page = 1): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBTVSummary>>('/tv/popular', { page })
  return data.results.map(mapTVSummary)
}

export async function fetchTopRatedTV(page = 1): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBTVSummary>>('/tv/top_rated', { page })
  return data.results.map(mapTVSummary)
}

export async function fetchTrendingTV(page = 1): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBTVSummary>>('/trending/tv/week', { page })
  return data.results.map(mapTVSummary)
}

export async function fetchOnTheAirTV(page = 1): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBTVSummary>>('/tv/on_the_air', { page })
  return data.results.map(mapTVSummary)
}

/** TMDB's real discover/tv endpoint - see fetchDiscoverMovies for why this
 * is the one Discover's filters use instead of the fixed lists above. */
export async function fetchDiscoverTV(params: DiscoverParams, page = 1): Promise<MediaSummary[]> {
  const data = await tmdbFetch<TMDBPaginated<TMDBTVSummary>>('/discover/tv', {
    page,
    sort_by: TV_SORT_BY[params.sort],
    with_genres: params.genreId,
    first_air_date_year: params.year,
    'vote_average.gte': params.minRating,
  })
  return data.results.map(mapTVSummary)
}

export async function fetchTVDetail(mediaId: string): Promise<TVShowDetail> {
  const id = extractId(mediaId)
  const raw = await tmdbFetch<TMDBTVDetail>(`/tv/${id}`, {
    append_to_response: 'credits,similar,recommendations',
  })

  const seasons: Season[] = await Promise.all(
    raw.seasons
      .filter((s) => s.season_number > 0)
      .map(async (s) => {
        const seasonRaw = await tmdbFetch<TMDBSeasonDetail>(`/tv/${id}/season/${s.season_number}`)
        return mapSeasonDetail(mediaId, seasonRaw)
      }),
  )

  return mapTVDetail(raw, seasons)
}
