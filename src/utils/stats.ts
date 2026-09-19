import type { LibraryEntry, EpisodeProgress, Rating, WatchRecord } from '@/types/watch'
import type { MediaSummary } from '@/types/media'
import { genreName } from '@/data/genres'

export interface QuickStats {
  moviesWatched: number
  showsInProgressOrCompleted: number
  episodesWatched: number
  totalWatchMinutes: number
  averageRating: number | null
  averageMovieRating: number | null
  averageEpisodeRating: number | null
  moviesWatchedThisMonth: number
  episodesWatchedThisMonth: number
  moviesWatchedThisYear: number
  episodesWatchedThisYear: number
}

function isSameMonth(iso: string | null, ref: Date): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

function isSameYear(iso: string | null, ref: Date): boolean {
  if (!iso) return false
  return new Date(iso).getFullYear() === ref.getFullYear()
}

const EPISODE_RATING_PATTERN = /-s\d+e\d+$/

export function computeQuickStats(params: {
  entries: Record<string, LibraryEntry>
  watchRecords: WatchRecord[]
  episodeProgress: EpisodeProgress[]
  ratings: Record<string, Rating>
}): QuickStats {
  const { entries, watchRecords, episodeProgress, ratings } = params
  const now = new Date()

  const moviesWatched = watchRecords.filter((r) => r.mediaType === 'movie').length
  const watchedEpisodes = episodeProgress.filter((p) => p.watched)
  const showsInProgressOrCompleted = Object.values(entries).filter(
    (e) => e.mediaType === 'tv' && (e.status === 'watching' || e.status === 'completed'),
  ).length

  const movieMinutes = watchRecords.reduce((sum, r) => sum + (r.runtimeMinutes ?? 0), 0)
  const episodeMinutes = watchedEpisodes.reduce((sum, p) => sum + (p.runtimeMinutes ?? 0), 0)

  const allRatings = Object.values(ratings)
  const movieRatings = allRatings.filter((r) => r.mediaType === 'movie').map((r) => r.value)
  const episodeRatings = allRatings.filter((r) => r.mediaType === 'tv' && EPISODE_RATING_PATTERN.test(r.mediaId)).map((r) => r.value)
  const allValues = allRatings.map((r) => r.value)

  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)

  return {
    moviesWatched,
    showsInProgressOrCompleted,
    episodesWatched: watchedEpisodes.length,
    totalWatchMinutes: movieMinutes + episodeMinutes,
    averageRating: avg(allValues),
    averageMovieRating: avg(movieRatings),
    averageEpisodeRating: avg(episodeRatings),
    moviesWatchedThisMonth: watchRecords.filter((r) => r.mediaType === 'movie' && isSameMonth(r.watchedAt, now)).length,
    episodesWatchedThisMonth: watchedEpisodes.filter((p) => isSameMonth(p.watchedAt, now)).length,
    moviesWatchedThisYear: watchRecords.filter((r) => r.mediaType === 'movie' && isSameYear(r.watchedAt, now)).length,
    episodesWatchedThisYear: watchedEpisodes.filter((p) => isSameYear(p.watchedAt, now)).length,
  }
}

export function formatWatchTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours === 0) return `${minutes} dk`
  if (minutes === 0) return `${hours} sa`
  return `${hours} sa ${minutes} dk`
}

export interface GenreSlice {
  id: number
  name: string
  count: number
  percent: number
}

/** Genre distribution over every watched title (movies + shows), weighted
 * by title, not by rewatch/episode count - "what kinds of things do you
 * watch", not "which single show dominates because it has 90 episodes". */
export function getGenreDistribution(watchedSummaries: MediaSummary[]): GenreSlice[] {
  const counts = new Map<number, number>()
  for (const item of watchedSummaries) {
    for (const genreId of item.genreIds) counts.set(genreId, (counts.get(genreId) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  return [...counts.entries()]
    .map(([id, count]) => ({ id, name: genreName(id), count, percent: total === 0 ? 0 : Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
}

export interface RatingBucket {
  label: string
  count: number
}

export function getRatingDistribution(ratings: Rating[]): RatingBucket[] {
  const buckets: RatingBucket[] = [
    { label: '0.5-1', count: 0 },
    { label: '1.5-2', count: 0 },
    { label: '2.5-3', count: 0 },
    { label: '3.5-4', count: 0 },
    { label: '4.5-5', count: 0 },
  ]
  for (const r of ratings) {
    const index = Math.min(4, Math.max(0, Math.floor((r.value - 0.5) / 1)))
    buckets[index].count += 1
  }
  return buckets
}

export interface MonthlyActivity {
  key: string
  label: string
  movies: number
  episodes: number
  minutes: number
}

/** Last `months` calendar months, oldest first, always including empty
 * months so the chart's x-axis doesn't silently skip quiet periods. */
export function getMonthlyActivity(watchRecords: WatchRecord[], episodeProgress: EpisodeProgress[], months = 12): MonthlyActivity[] {
  const now = new Date()
  const buckets: MonthlyActivity[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({ key, label: d.toLocaleDateString('tr-TR', { month: 'short' }), movies: 0, episodes: 0, minutes: 0 })
  }
  const indexByKey = new Map(buckets.map((b, i) => [b.key, i]))

  for (const r of watchRecords) {
    const d = new Date(r.watchedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const idx = indexByKey.get(key)
    if (idx === undefined) continue
    buckets[idx].movies += 1
    buckets[idx].minutes += r.runtimeMinutes ?? 0
  }
  for (const p of episodeProgress) {
    if (!p.watched || !p.watchedAt) continue
    const d = new Date(p.watchedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const idx = indexByKey.get(key)
    if (idx === undefined) continue
    buckets[idx].episodes += 1
    buckets[idx].minutes += p.runtimeMinutes ?? 0
  }
  return buckets
}

export function getAvailableYears(watchRecords: WatchRecord[], episodeProgress: EpisodeProgress[]): number[] {
  const years = new Set<number>()
  for (const r of watchRecords) years.add(new Date(r.watchedAt).getFullYear())
  for (const p of episodeProgress) if (p.watched && p.watchedAt) years.add(new Date(p.watchedAt).getFullYear())
  years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
}
