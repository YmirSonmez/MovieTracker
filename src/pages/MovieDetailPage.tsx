import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Bookmark, Check, Heart, ListPlus, RotateCcw, Trash2 } from 'lucide-react'
import { movieService, isLiveDataConfigured } from '@/services'
import { getAllSummaries } from '@/data/catalog'
import { toSummary } from '@/utils/media'
import { findSimilarByGenre } from '@/utils/recommend'
import { useLibraryStore } from '@/store/libraryStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { useLibraryActions } from '@/hooks/useLibraryActions'
import { Button, ConfirmDialog, ErrorState } from '@/components/ui'
import { DetailHero } from '@/components/media/DetailHero'
import { DetailSkeleton } from '@/components/media/DetailSkeleton'
import { CastRail } from '@/components/media/CastRail'
import { MediaRail } from '@/components/media/MediaRail'
import { RatingReviewCard } from '@/components/media/RatingReviewCard'
import { AddToListDialog } from '@/components/media/AddToListDialog'
import type { MovieDetail } from '@/types/media'

export function MovieDetailPage() {
  const { mediaId = '' } = useParams()
  const [detail, setDetail] = useState<MovieDetail | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)

  const entry = useLibraryStore((s) => s.entries[mediaId])
  const watchedAt = useLibraryStore((s) => s.watchRecords.find((r) => r.mediaId === mediaId)?.watchedAt)
  const { toggleFavorite, addToWatchlist, removeFromWatchlist, markWatched, markUnwatched } = useLibraryActions()

  useEffect(() => {
    let cancelled = false
    setDetail(undefined)
    setFailed(false)
    movieService
      .getDetail(mediaId)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        if (d) useMediaCacheStore.getState().cache([toSummary(d)])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [mediaId])

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
    return <ErrorState title="Film bulunamadı" description="Bu film kaldırılmış ya da hiç var olmamış olabilir." />
  }

  const isWatched = entry?.status === 'completed'
  const isWatchlisted = entry?.status === 'planned'
  const runtimeLabel = detail.runtime ? `${Math.floor(detail.runtime / 60)}s ${detail.runtime % 60}dk` : null
  const metaLine = [detail.year, runtimeLabel, detail.director?.name].filter(Boolean).join(' · ')

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
              variant={isWatched ? 'secondary' : 'primary'}
              onClick={() => (isWatched ? markUnwatched(toSummary(detail)) : markWatched(toSummary(detail)))}
            >
              <Check className="h-4 w-4" />
              {isWatched ? 'İzledim' : 'İzledim olarak işaretle'}
            </Button>
            {isWatched && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Tekrar izledim"
                onClick={() => useLibraryStore.getState().rewatch(mediaId, 'movie', undefined, detail.runtime ?? undefined)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
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
          isWatched && watchedAt ? (
            <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
              {new Date(watchedAt).toLocaleDateString('tr-TR')} tarihinde izlendi
            </span>
          ) : undefined
        }
      />

      <p className="max-w-3xl text-text-muted">{detail.overview}</p>

      <RatingReviewCard mediaId={mediaId} mediaType="movie" />

      <CastRail cast={detail.cast} />

      {detail.productionCountries.length > 0 && (
        <p className="text-sm text-text-subtle">Yapım: {detail.productionCountries.join(', ')}</p>
      )}

      <MediaRail title="Benzer Filmler" items={similar} />
      <MediaRail title="Önerilen Filmler" items={recommended} />

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
        description={`"${detail.title}" izleme geçmişi, puanı ve notuyla birlikte kitaplığından kaldırılacak.`}
        onConfirm={() => useLibraryStore.getState().removeFromLibrary(mediaId)}
      />
    </div>
  )
}
