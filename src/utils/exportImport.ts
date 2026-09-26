import { useLibraryStore } from '@/store/libraryStore'
import { useRatingsStore } from '@/store/ratingsStore'
import { useListsStore } from '@/store/listsStore'
import { useProfileStore } from '@/store/profileStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { useApiConfigStore } from '@/store/apiConfigStore'
import { storage } from '@/services/storage/repository'
import { hydrateAllStores } from '@/store/init'
import { EXPORT_SCHEMA_VERSION } from '@/utils/constants'
import type { MovieTrackerExport, ImportPreview, ImportStrategy } from '@/types/export'

export function buildExportBundle(): MovieTrackerExport {
  const library = useLibraryStore.getState()
  const ratingsState = useRatingsStore.getState()
  const lists = useListsStore.getState()
  const profileState = useProfileStore.getState()
  const mediaCache = useMediaCacheStore.getState()
  const apiConfigState = useApiConfigStore.getState()

  return {
    version: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profileState.profile,
    settings: profileState.settings,
    apiConfig: apiConfigState.config,
    libraryEntries: Object.values(library.entries),
    watchRecords: library.watchRecords,
    episodeProgress: library.episodeProgress,
    ratings: Object.values(ratingsState.ratings),
    reviews: Object.values(ratingsState.reviews),
    favoritePeople: [],
    lists: lists.lists,
    mediaCache: Object.values(mediaCache.items),
  }
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportAsJSON(bundle: MovieTrackerExport): void {
  const dateStamp = bundle.exportedAt.slice(0, 10)
  downloadFile(`movie-tracker-backup-${dateStamp}.json`, JSON.stringify(bundle, null, 2), 'application/json')
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function exportAsCSV(bundle: MovieTrackerExport): void {
  const mediaById = new Map(bundle.mediaCache.map((m) => [m.id, m]))
  const ratingById = new Map(bundle.ratings.map((r) => [r.mediaId, r.value]))
  const lastWatchByMedia = new Map<string, string>()
  for (const r of bundle.watchRecords) {
    const existing = lastWatchByMedia.get(r.mediaId)
    if (!existing || existing < r.watchedAt) lastWatchByMedia.set(r.mediaId, r.watchedAt)
  }

  const header = ['Başlık', 'Tür', 'Yıl', 'Durum', 'Favori', 'Puanım', 'Son İzleme Tarihi', 'Eklenme Tarihi']
  const rows = bundle.libraryEntries.map((entry) => {
    const media = mediaById.get(entry.mediaId)
    return [
      media?.title ?? entry.mediaId,
      entry.mediaType === 'movie' ? 'Film' : 'Dizi',
      media?.year ?? '',
      entry.status ?? '',
      entry.isFavorite ? 'Evet' : 'Hayır',
      ratingById.get(entry.mediaId) ?? '',
      lastWatchByMedia.get(entry.mediaId) ?? '',
      entry.addedAt,
    ]
  })

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
  const dateStamp = bundle.exportedAt.slice(0, 10)
  downloadFile(`movie-tracker-library-${dateStamp}.csv`, csv, 'text/csv;charset=utf-8')
}

export class ImportValidationError extends Error {}

export function parseImportBundle(raw: string): MovieTrackerExport {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new ImportValidationError('Dosya geçerli bir JSON değil.')
  }
  if (!data || typeof data !== 'object' || !('version' in data)) {
    throw new ImportValidationError('Bu bir Movie Tracker yedeği gibi görünmüyor.')
  }
  const bundle = data as Partial<MovieTrackerExport>
  if (typeof bundle.version !== 'number') {
    throw new ImportValidationError('Yedek dosyasında sürüm bilgisi yok.')
  }
  if (bundle.version > EXPORT_SCHEMA_VERSION) {
    throw new ImportValidationError('Bu yedek, uygulamanın daha yeni bir sürümünden alınmış. Lütfen uygulamayı güncelle.')
  }
  // v1 backups have no apiConfig field at all - default it to empty rather
  // than fail the import. v3's dataVersion is simply ignored. Future
  // migrations slot in here, keyed off bundle.version, before returning.
  return {
    version: bundle.version,
    exportedAt: bundle.exportedAt ?? new Date().toISOString(),
    profile: bundle.profile as MovieTrackerExport['profile'],
    settings: bundle.settings as MovieTrackerExport['settings'],
    apiConfig: bundle.apiConfig ?? {},
    libraryEntries: bundle.libraryEntries ?? [],
    watchRecords: bundle.watchRecords ?? [],
    episodeProgress: bundle.episodeProgress ?? [],
    ratings: bundle.ratings ?? [],
    reviews: bundle.reviews ?? [],
    favoritePeople: bundle.favoritePeople ?? [],
    lists: bundle.lists ?? [],
    mediaCache: bundle.mediaCache ?? [],
  }
}

export function buildImportPreview(bundle: MovieTrackerExport): ImportPreview {
  return {
    version: bundle.version,
    isSupported: bundle.version <= EXPORT_SCHEMA_VERSION,
    containsApiKey: Boolean(bundle.apiConfig?.tmdbApiKey),
    counts: {
      libraryEntries: bundle.libraryEntries.length,
      watchRecords: bundle.watchRecords.length,
      episodeProgress: bundle.episodeProgress.length,
      ratings: bundle.ratings.length,
      reviews: bundle.reviews.length,
      lists: bundle.lists.length,
      favoritePeople: bundle.favoritePeople.length,
    },
  }
}

/** Both strategies write through the repository as ordinary local edits,
 * so the result syncs to every other device like any other change. */
export async function applyImport(bundle: MovieTrackerExport, strategy: ImportStrategy): Promise<void> {
  if (strategy === 'replace') await storage.importReplace(bundle)
  else await storage.importMerge(bundle)
  await hydrateAllStores()
}
