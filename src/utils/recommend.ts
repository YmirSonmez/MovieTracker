import type { MediaSummary } from '@/types/media'

/** Weights genres by how much the user rated (or just watched) titles that
 * carry them, so "favorite genres" reflects taste, not just volume. */
export function inferFavoriteGenres(watched: MediaSummary[], ratingByMediaId: Record<string, number>): number[] {
  const weight = new Map<number, number>()
  for (const item of watched) {
    const rating = ratingByMediaId[item.id]
    const w = rating ? rating / 2.5 : 1
    for (const genreId of item.genreIds) {
      weight.set(genreId, (weight.get(genreId) ?? 0) + w)
    }
  }
  return [...weight.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

interface RecommendOptions {
  pool: MediaSummary[]
  excludeIds: Set<string>
  favoriteGenreIds: number[]
  limit?: number
}

/** Pure, client-side "Recommended for You": scores the pool by overlap with
 * favorite genres (earlier genres in the list count more) plus a small
 * quality nudge from voteAverage, then returns the top N. No network calls -
 * this only reorders titles the app already knows about. */
export function recommendMedia({ pool, excludeIds, favoriteGenreIds, limit = 12 }: RecommendOptions): MediaSummary[] {
  const genreRank = new Map(favoriteGenreIds.map((id, i) => [id, favoriteGenreIds.length - i]))

  return pool
    .filter((item) => !excludeIds.has(item.id))
    .map((item) => {
      const genreScore = item.genreIds.reduce((sum, id) => sum + (genreRank.get(id) ?? 0), 0)
      const qualityScore = (item.voteAverage ?? 0) / 10
      return { item, score: genreScore + qualityScore }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item)
}

export function findSimilarByGenre(target: MediaSummary, pool: MediaSummary[], limit = 10): MediaSummary[] {
  const targetGenres = new Set(target.genreIds)
  return pool
    .filter((item) => item.id !== target.id)
    .map((item) => ({ item, overlap: item.genreIds.filter((g) => targetGenres.has(g)).length }))
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((s) => s.item)
}
