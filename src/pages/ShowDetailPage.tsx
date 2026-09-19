import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Bookmark, Check, Heart, ListPlus, Trash2, X } from 'lucide-react'
import { tvService, isLiveDataConfigured } from '@/services'
import { getAllSummaries } from '@/data/catalog'
import { toSummary } from '@/utils/media'
import { findSimilarByGenre } from '@/utils/recommend'
import { getNextEpisode, getShowCompletion, getSeasonCompletion } from '@/utils/progress'
import { useLibraryStore } from '@/store/libraryStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { useLibraryActions } from '@/hooks/useLibraryActions'
import { Button, ConfirmDialog, ErrorState, ProgressBar, Select } from '@/components/ui'
import { DetailHero } from '@/components/media/DetailHero'
import { DetailSkeleton } from '@/components/media/DetailSkeleton'
import { CastRail } from '@/components/media/CastRail'
import { MediaRail } from '@/components/media/MediaRail'
import { RatingReviewCard } from '@/components/media/RatingReviewCard'
import { AddToListDialog } from '@/components/media/AddToListDialog'
import { EpisodeRow } from '@/components/media/EpisodeRow'
import type { TVShowDetail } from '@/types/media'

const TV_STATUS_LABEL: Record<string, string> = {
  returning: 'Devam Ediyor',
  ended: 'Sona Erdi',
  canceled: 'İptal Edildi',
  in_production: 'Yapımda',
  planned: 'Planlanıyor',
  unknown: '',
}

export function ShowDetailPage() {
  const { mediaId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const continueParam = searchParams.get('continue')

  const [detail, setDetail] = useState<TVShowDetail | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const highlightRef = useRef<HTMLDivElement | null>(null)

  const episodeProgress = useLibraryStore((s) => s.episodeProgress)
  const entry = useLibraryStore((s) => s.entries[mediaId])
  const { toggleFavorite, addToWatchlist, removeFromWatchlist } = useLibraryActions()

  useEffect(() => {
    let cancelled = false
    setDetail(undefined)
    setFailed(false)
    setSelectedSeason(null)
    tvService
      .getDetail(mediaId)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        if (d) useMediaCacheStore.getState().cache([toSummary(d)])
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [mediaId])

  useEffect(() => {
    if (!detail || selectedSeason !== null) return
    const match = continueParam ? /^s(\d+)e\d+$/.exec(continueParam) : null
    if (match) {
      setSelectedSeason(Number(match[1]))
      return
    }
    const next = getNextEpisode(detail.seasons, episodeProgress)
    setSelectedSeason(next?.seasonNumber ?? detail.seasons[0]?.seasonNumber ?? 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once per loaded detail to pick an initial season
  }, [detail])

  useEffect(() => {
    if (!detail) return
    useLibraryStore.getState().syncShowStatusFromProgress(mediaId, detail.seasons)
  }, [detail, mediaId, episodeProgress])

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedSeason])

  const fallbackPool = useMemo(() => (isLiveDataConfigured() ? [] : getAllSummaries()), [])
  const similar = useMemo(() => {
    if (!detail) return []
    return detail.similar.length > 0 ? detail.similar : findSimilarByGenre(toSummary(detail), fallbackPool)
  }, [detail, fallbackPool])
  const recommended = useMemo(() => {
    if (!detail) return []
    return detail.recommendations.length > 0 ? detail.recommendations : similar
  }, [detail, similar])

  if (failed) return <ErrorState onRetry={() => setDetail(undefined)} />
  if (detail === undefined) return <DetailSkeleton />
  if (detail === null) {
    return <ErrorState title="Dizi bulunamadı" description="Bu dizi kaldırılmış ya da hiç var olmamış olabilir." />
  }

  const overall = getShowCompletion(detail.seasons, episodeProgress)
  const season = detail.seasons.find((s) => s.seasonNumber === selectedSeason) ?? detail.seasons[0]
  const seasonCompletion = season ? getSeasonCompletion(season, episodeProgress) : { watchedCount: 0, totalCount: 0, percent: 0 }
  const isWatchlisted = entry?.status === 'planned'
  const metaLine = [detail.year, detail.network, TV_STATUS_LABEL[detail.status], `${detail.numberOfSeasons} sezon`]
    .filter(Boolean)
    .join(' · ')
  const highlightedEpisodeId = continueParam ? `${mediaId}-${continueParam}` : undefined

  return (
    <div className="flex flex-col gap-8 pb-10">
      <DetailHero
        backdropPath={detail.backdropPath}
        posterPath={detail.posterPath}
        title={detail.title}
        originalTitle={detail.originalTitle}
        metaLine={metaLine}
        genres={detail.genres.map((g) => g.name)}
        voteAverage={detail.voteAverage}
        actions={
          <>
            <Button
              variant="primary"
              onClick={async () => {
                await useLibraryStore.getState().markAllEpisodesWatched(mediaId, detail.seasons)
                setSearchParams({}, { replace: true })
              }}
            >
              <Check className="h-4 w-4" /> Tümünü İzledim Olarak İşaretle
            </Button>
            <Button
              variant={isWatchlisted ? 'secondary' : 'outline'}
              onClick={() => (isWatchlisted ? removeFromWatchlist(toSummary(detail)) : addToWatchlist(toSummary(detail)))}
            >
              <Bookmark className="h-4 w-4" fill={isWatchlisted ? 'currentColor' : 'none'} />
              {isWatchlisted ? 'İzleme Listesinde' : 'İzleme Listesine Ekle'}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Favorile" onClick={() => toggleFavorite(toSummary(detail))}>
              <Heart className="h-4 w-4" fill={entry?.isFavorite ? 'currentColor' : 'none'} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Listeye ekle" onClick={() => setListDialogOpen(true)}>
              <ListPlus className="h-4 w-4" />
            </Button>
          </>
        }
        statusBadge={
          overall.totalCount > 0 ? (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs text-text-muted">
              {overall.watchedCount}/{overall.totalCount} bölüm · %{overall.percent}
            </span>
          ) : undefined
        }
      />

      <p className="max-w-3xl text-text-muted">{detail.overview}</p>

      <RatingReviewCard mediaId={mediaId} mediaType="tv" />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text">Bölümler</h2>
          {detail.seasons.length > 1 && (
            <Select
              value={String(season?.seasonNumber ?? 1)}
              onValueChange={(v) => {
                setSelectedSeason(Number(v))
                if (continueParam) setSearchParams({}, { replace: true })
              }}
              options={detail.seasons.map((s) => ({ value: String(s.seasonNumber), label: s.name }))}
              size="sm"
            />
          )}
        </div>

        {season && (
          <>
            <div className="flex items-center gap-3">
              <ProgressBar percent={seasonCompletion.percent} className="max-w-xs flex-1" label="Sezon ilerlemesi" />
              <span className="font-mono text-xs text-text-subtle">
                {seasonCompletion.watchedCount}/{seasonCompletion.totalCount} · %{seasonCompletion.percent}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => useLibraryStore.getState().markSeasonWatched(mediaId, season)}
              >
                <Check className="h-3.5 w-3.5" /> Sezonu işaretle
              </Button>
            </div>

            {continueParam && (
              <div className="flex items-center justify-between rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
                <span>Kaldığın yerden devam ediyorsun.</span>
                <button type="button" onClick={() => setSearchParams({}, { replace: true })} aria-label="Kapat">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col divide-y divide-border">
              {season.episodes.map((episode) => (
                <EpisodeRow
                  key={episode.id}
                  episode={episode}
                  highlighted={episode.id === highlightedEpisodeId}
                  rowRef={episode.id === highlightedEpisodeId ? (el) => (highlightRef.current = el) : undefined}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <CastRail cast={detail.cast} />

      <MediaRail title="Benzer Diziler" items={similar} />
      <MediaRail title="Önerilen Diziler" items={recommended} />

      {entry && (
        <button
          type="button"
          onClick={() => setRemoveConfirmOpen(true)}
          className="flex w-fit items-center gap-2 text-sm text-text-subtle hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" /> Kitaplıktan kaldır
        </button>
      )}

      <AddToListDialog open={listDialogOpen} onOpenChange={setListDialogOpen} mediaId={mediaId} mediaTitle={detail.title} />
      <ConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={setRemoveConfirmOpen}
        title="Kitaplıktan kaldırılsın mı?"
        description={`"${detail.title}" tüm bölüm ilerlemesi, puanı ve notuyla birlikte kitaplığından kaldırılacak.`}
        onConfirm={() => useLibraryStore.getState().removeFromLibrary(mediaId)}
      />
    </div>
  )
}
