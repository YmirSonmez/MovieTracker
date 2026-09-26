import { useLibraryStore } from '@/store/libraryStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { useProfileStore } from '@/store/profileStore'
import { toast } from '@/store/toastStore'
import type { MediaSummary } from '@/types/media'

/**
 * Shared "act on a title from anywhere" helpers: cards, detail pages, and
 * search results all route through these instead of calling the store
 * directly, so the media-cache write and the confirmation toast never get
 * forgotten in one call site.
 *
 * Nothing here awaits a disk write: store actions update the screen
 * synchronously and save in the background (see store/persist.ts), so the
 * change and its toast land on the same frame as the tap.
 */
export function useLibraryActions() {
  function toggleFavorite(summary: MediaSummary) {
    void useMediaCacheStore.getState().cache([summary])
    const wasFavorite = Boolean(useLibraryStore.getState().entries[summary.id]?.isFavorite)
    void useLibraryStore.getState().toggleFavorite(summary.id, summary.mediaType)
    toast({
      title: wasFavorite ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi',
      description: summary.title,
      action: wasFavorite ? { label: 'Geri al', onClick: () => useLibraryStore.getState().toggleFavorite(summary.id, summary.mediaType) } : undefined,
    })
  }

  function addToWatchlist(summary: MediaSummary) {
    void useMediaCacheStore.getState().cache([summary])
    void useLibraryStore.getState().addToWatchlist(summary.id, summary.mediaType)
    toast({ title: 'İzleme listesine eklendi', description: summary.title, variant: 'success' })
  }

  function removeFromWatchlist(summary: MediaSummary) {
    const entry = useLibraryStore.getState().entries[summary.id]
    void useLibraryStore.getState().removeFromWatchlist(summary.id)
    toast({
      title: 'İzleme listesinden kaldırıldı',
      description: summary.title,
      action: {
        label: 'Geri al',
        onClick: () => useLibraryStore.getState().addToWatchlist(summary.id, summary.mediaType, entry?.watchlistPriority, entry?.watchlistNote),
      },
    })
  }

  function markWatched(summary: MediaSummary) {
    if (useProfileStore.getState().settings.confirmBeforeMarkingWatched) {
      const confirmed = window.confirm(`"${summary.title}" izlendi olarak işaretlensin mi?`)
      if (!confirmed) return
    }
    void useMediaCacheStore.getState().cache([summary])
    void useLibraryStore.getState().markWatched(summary.id, summary.mediaType, undefined, summary.runtimeMinutes)
    toast({ title: 'İzlendi olarak işaretlendi', description: summary.title, variant: 'success' })
  }

  function markUnwatched(summary: MediaSummary) {
    void useLibraryStore.getState().markUnwatched(summary.id)
    toast({ title: 'İzlenmedi olarak işaretlendi', description: summary.title })
  }

  return { toggleFavorite, addToWatchlist, removeFromWatchlist, markWatched, markUnwatched }
}
