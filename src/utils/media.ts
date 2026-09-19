import type { MediaSummary, MovieDetail, TVShowDetail } from '@/types/media'

export function toSummary(detail: MovieDetail | TVShowDetail): MediaSummary {
  const { id, mediaType, title, originalTitle, overview, posterPath, backdropPath, year, voteAverage, genreIds } = detail
  const runtimeMinutes =
    detail.mediaType === 'movie'
      ? (detail.runtime ?? undefined)
      : average(detail.seasons.flatMap((s) => s.episodes.map((e) => e.runtime).filter((r): r is number => r != null)))
  return { id, mediaType, title, originalTitle, overview, posterPath, backdropPath, year, voteAverage, genreIds, runtimeMinutes }
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}
