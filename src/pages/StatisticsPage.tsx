import { useMemo, useState } from 'react'
import { BarChart3, Clapperboard, Film, Sparkles, Timer } from 'lucide-react'
import { useLibraryStore } from '@/store/libraryStore'
import { useRatingsStore } from '@/store/ratingsStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { computeQuickStats, formatWatchTime, getGenreDistribution, getRatingDistribution, getMonthlyActivity, getAvailableYears } from '@/utils/stats'
import { Card, Select } from '@/components/ui'
import { StatCard } from '@/components/stats/StatCard'
import { GenreDistributionChart } from '@/components/stats/GenreDistributionChart'
import { RatingDistributionChart } from '@/components/stats/RatingDistributionChart'
import { MonthlyActivityChart } from '@/components/stats/MonthlyActivityChart'
import { WatchTimeChart } from '@/components/stats/WatchTimeChart'
import type { MediaSummary } from '@/types/media'

export function StatisticsPage() {
  const entries = useLibraryStore((s) => s.entries)
  const watchRecords = useLibraryStore((s) => s.watchRecords)
  const episodeProgress = useLibraryStore((s) => s.episodeProgress)
  const ratings = useRatingsStore((s) => s.ratings)
  const mediaCache = useMediaCacheStore((s) => s.items)

  const availableYears = useMemo(() => getAvailableYears(watchRecords, episodeProgress), [watchRecords, episodeProgress])
  const [year, setYear] = useState(String(availableYears[0] ?? new Date().getFullYear()))

  const stats = useMemo(
    () => computeQuickStats({ entries, watchRecords, episodeProgress, ratings }),
    [entries, watchRecords, episodeProgress, ratings],
  )

  const watchedSummaries = useMemo(() => {
    const ids = new Set<string>()
    for (const r of watchRecords) ids.add(r.mediaId)
    for (const p of episodeProgress) if (p.watched) ids.add(p.showId)
    return [...ids].map((id) => mediaCache[id]).filter((s): s is MediaSummary => Boolean(s))
  }, [watchRecords, episodeProgress, mediaCache])

  const genreDistribution = useMemo(() => getGenreDistribution(watchedSummaries), [watchedSummaries])
  const ratingDistribution = useMemo(() => getRatingDistribution(Object.values(ratings)), [ratings])

  const yearFilteredActivity = useMemo(() => {
    const yearRecords = watchRecords.filter((r) => new Date(r.watchedAt).getFullYear() === Number(year))
    const yearEpisodes = episodeProgress.filter((p) => p.watched && p.watchedAt && new Date(p.watchedAt).getFullYear() === Number(year))
    return getMonthlyActivity(yearRecords, yearEpisodes, 12)
  }, [watchRecords, episodeProgress, year])

  const isEmpty = stats.moviesWatched === 0 && stats.episodesWatched === 0

  return (
    <div className="flex flex-col gap-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">İstatistikler</h1>
        {availableYears.length > 1 && (
          <Select value={year} onValueChange={setYear} options={availableYears.map((y) => ({ value: String(y), label: String(y) }))} size="sm" />
        )}
      </div>

      {isEmpty ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <Sparkles className="h-6 w-6 text-accent" />
          <p className="font-medium text-text">Henüz istatistik yok</p>
          <p className="max-w-sm text-sm text-text-subtle">Birkaç film ya da bölüm izleyince kişisel istatistiklerin burada canlanacak.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Film" value={stats.moviesWatched} icon={Clapperboard} />
            <StatCard label="Dizi" value={stats.showsInProgressOrCompleted} icon={Film} />
            <StatCard label="Bölüm" value={stats.episodesWatched} icon={Film} />
            <StatCard label="Toplam süre" value={formatWatchTime(stats.totalWatchMinutes)} icon={Timer} />
            <StatCard label="Film puanı ort." value={stats.averageMovieRating ? stats.averageMovieRating.toFixed(1) : '—'} icon={Sparkles} />
            <StatCard label="Bölüm puanı ort." value={stats.averageEpisodeRating ? stats.averageEpisodeRating.toFixed(1) : '—'} icon={BarChart3} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Bu ay film" value={stats.moviesWatchedThisMonth} icon={Clapperboard} />
            <StatCard label="Bu ay bölüm" value={stats.episodesWatchedThisMonth} icon={Film} />
            <StatCard label="Bu yıl film" value={stats.moviesWatchedThisYear} icon={Clapperboard} />
            <StatCard label="Bu yıl bölüm" value={stats.episodesWatchedThisYear} icon={Film} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-text">Tür Dağılımı</h2>
              <GenreDistributionChart data={genreDistribution} />
            </Card>
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-text">Puan Dağılımı</h2>
              <RatingDistributionChart data={ratingDistribution} />
            </Card>
          </div>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-text">Aylık İzleme Aktivitesi · {year}</h2>
            <MonthlyActivityChart data={yearFilteredActivity} />
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-text">Aylık İzleme Süresi · {year}</h2>
            <WatchTimeChart data={yearFilteredActivity} />
          </Card>
        </>
      )}
    </div>
  )
}
