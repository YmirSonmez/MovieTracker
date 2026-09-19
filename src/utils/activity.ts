import type { EpisodeProgress, WatchRecord } from '@/types/watch'

/** Latest "I watched something for this title" timestamp per mediaId,
 * merging movie WatchRecords with the most recent watched episode per show.
 * Shared by Home ("Recently Watched") and Library ("Recently Watched" sort). */
export function getLastActivityMap(watchRecords: WatchRecord[], episodeProgress: EpisodeProgress[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const record of watchRecords) {
    const existing = map.get(record.mediaId)
    if (!existing || existing < record.watchedAt) map.set(record.mediaId, record.watchedAt)
  }
  for (const progress of episodeProgress) {
    if (!progress.watched || !progress.watchedAt) continue
    const existing = map.get(progress.showId)
    if (!existing || existing < progress.watchedAt) map.set(progress.showId, progress.watchedAt)
  }
  return map
}
