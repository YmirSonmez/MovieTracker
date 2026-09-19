import type { Episode, Season } from '@/types/media'
import type { EpisodeProgress } from '@/types/watch'
import { episodeProgressId } from './id'

function sortedEpisodes(seasons: Season[]): Episode[] {
  return [...seasons]
    .sort((a, b) => a.seasonNumber - b.seasonNumber)
    .flatMap((season) => [...season.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber))
}

export function isEpisodeWatched(
  progress: EpisodeProgress[],
  showId: string,
  seasonNumber: number,
  episodeNumber: number,
): boolean {
  const id = episodeProgressId(showId, seasonNumber, episodeNumber)
  return progress.some((p) => p.id === id && p.watched)
}

export interface ShowCompletion {
  watchedCount: number
  totalCount: number
  percent: number
}

export function getShowCompletion(seasons: Season[], progress: EpisodeProgress[]): ShowCompletion {
  const episodes = sortedEpisodes(seasons)
  const watchedIds = new Set(progress.filter((p) => p.watched).map((p) => p.id))
  const watchedCount = episodes.filter((e) => watchedIds.has(episodeProgressId(e.showId, e.seasonNumber, e.episodeNumber))).length
  const totalCount = episodes.length
  return {
    watchedCount,
    totalCount,
    percent: totalCount === 0 ? 0 : Math.round((watchedCount / totalCount) * 100),
  }
}

/**
 * "Continue watching" target: the earliest unwatched episode in broadcast
 * order. Sequential viewing (S1E1, E2, E3 watched) resolves to S1E4 exactly
 * as expected; if the user skipped an episode, this surfaces that gap
 * instead of silently jumping past it - the user can still open any later
 * episode directly from the season view if the skip was intentional.
 */
export function getNextEpisode(seasons: Season[], progress: EpisodeProgress[]): Episode | null {
  const episodes = sortedEpisodes(seasons)
  const watchedIds = new Set(progress.filter((p) => p.watched).map((p) => p.id))
  return episodes.find((e) => !watchedIds.has(episodeProgressId(e.showId, e.seasonNumber, e.episodeNumber))) ?? null
}

export function getLastWatchedEpisode(seasons: Season[], progress: EpisodeProgress[]): Episode | null {
  const episodes = sortedEpisodes(seasons)
  const watched = progress.filter((p) => p.watched)
  if (watched.length === 0) return null
  const watchedIds = new Set(watched.map((p) => p.id))
  const reversed = [...episodes].reverse()
  return reversed.find((e) => watchedIds.has(episodeProgressId(e.showId, e.seasonNumber, e.episodeNumber))) ?? null
}
