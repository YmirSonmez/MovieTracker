import { MOVIES } from './movies'
import { SHOWS } from './shows'
import { toSummary } from './builders'
import type { MediaSummary, MovieDetail, TVShowDetail } from '@/types/media'

export { MOVIES, SHOWS }

export const ALL_DETAILS: Array<MovieDetail | TVShowDetail> = [...MOVIES, ...SHOWS]

const detailById = new Map(ALL_DETAILS.map((d) => [d.id, d]))
const summaryById = new Map(ALL_DETAILS.map((d) => [d.id, toSummary(d)]))

export function getMovieDetail(mediaId: string): MovieDetail | null {
  const detail = detailById.get(mediaId)
  return detail && detail.mediaType === 'movie' ? detail : null
}

export function getTVDetail(mediaId: string): TVShowDetail | null {
  const detail = detailById.get(mediaId)
  return detail && detail.mediaType === 'tv' ? detail : null
}

export function getSummary(mediaId: string): MediaSummary | undefined {
  return summaryById.get(mediaId)
}

export function getAllSummaries(): MediaSummary[] {
  return [...summaryById.values()]
}

function sortByRatingDesc(items: MediaSummary[]): MediaSummary[] {
  return [...items].sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))
}

function sortByYearDesc(items: MediaSummary[]): MediaSummary[] {
  return [...items].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
}

const movieSummaries = MOVIES.map(toSummary)
const showSummaries = SHOWS.map(toSummary)

export const demoCatalog = {
  movies: {
    popular: () => movieSummaries,
    topRated: () => sortByRatingDesc(movieSummaries),
    trending: () => sortByRatingDesc(movieSummaries).slice(0, 10),
    upcoming: () => sortByYearDesc(movieSummaries).slice(0, 6),
    nowPlaying: () => sortByYearDesc(movieSummaries).slice(0, 8),
  },
  tv: {
    popular: () => showSummaries,
    topRated: () => sortByRatingDesc(showSummaries),
    trending: () => sortByRatingDesc(showSummaries).slice(0, 6),
    onTheAir: () => showSummaries.filter((s) => SHOWS.find((sh) => sh.id === s.id)?.status === 'returning'),
  },
}

export function searchDemoCatalog(query: string): { movies: MediaSummary[]; shows: MediaSummary[] } {
  const q = query.trim().toLowerCase()
  if (!q) return { movies: [], shows: [] }
  const matches = (s: MediaSummary) => s.title.toLowerCase().includes(q) || (s.originalTitle ?? '').toLowerCase().includes(q)
  return {
    movies: movieSummaries.filter(matches),
    shows: showSummaries.filter(matches),
  }
}
