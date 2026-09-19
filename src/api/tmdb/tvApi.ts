import { tmdbFetch } from './client'
import { mapSeasonDetail, mapTVDetail, mapTVSummary } from './mappers'
import type { TMDBPaginated, TMDBSeasonDetail, TMDBTVDetail, TMDBTVSummary } from './types'
import type { MediaSummary, Season, TVShowDetail } from '@/types/media'

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
