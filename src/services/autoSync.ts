import { useLibraryStore } from '@/store/libraryStore'
import { useRatingsStore } from '@/store/ratingsStore'
import { useListsStore } from '@/store/listsStore'
import { useProfileStore } from '@/store/profileStore'
import { useCloudSyncStore } from '@/store/cloudSyncStore'
import { toast } from '@/store/toastStore'
import { backupToDrive, connectGoogleDrive, hasValidDriveToken, GoogleDriveError } from './googleDrive'
import { ROUTES } from '@/utils/routes'

/**
 * Once a visitor has connected Google Drive, this keeps their backup fresh
 * automatically - no more "go to Settings and click Yedekle" after every
 * change. Library/rating/list/profile changes are debounced into a single
 * background backupToDrive() call; failures are silent (this is a
 * convenience layer on top of the explicit backup button, not a promise the
 * user acted on, so it shouldn't interrupt them with an error toast).
 *
 * The one thing it can't paper over: the Drive access token lives only in
 * memory and expires after about an hour, and browsers refuse to open an
 * OAuth popup that wasn't triggered by a real click - so a silent
 * background reconnect is not possible. When that happens, this shows one
 * low-key toast with a "Yeniden Bağlan" button (a real click, so the popup
 * is allowed) instead of trying and failing silently forever.
 *
 * It also never pushes over a remote backup this device hasn't reconciled
 * with yet (see backupToDrive's `conflict` result) - that would silently
 * destroy a backup made from another device. That case gets its own
 * one-time toast pointing at Veri Yönetimi instead of a retried backup.
 */

const DEBOUNCE_MS = 4000

let timer: ReturnType<typeof setTimeout> | null = null
let started = false
let reconnectNoticeShown = false
let conflictNoticeShown = false

function attemptBackup() {
  const { connectedEmail, meta } = useCloudSyncStore.getState()
  // Nothing to keep in sync until a first backup has ever been made - that
  // one always comes from an explicit connect (banner or Settings).
  if (!connectedEmail && !meta.driveFileId) return

  if (!hasValidDriveToken()) {
    if (reconnectNoticeShown) return
    reconnectNoticeShown = true
    toast({
      title: 'Google Drive bağlantısı yenilenmeli',
      description: 'Otomatik yedeklemenin devam etmesi için tek tıkla yeniden bağlan.',
      action: {
        label: 'Yeniden Bağlan',
        onClick: () => {
          connectGoogleDrive()
            .then(() => {
              reconnectNoticeShown = false
              attemptBackup()
            })
            .catch((e) => {
              toast({
                title: 'Bağlantı başarısız oldu',
                description: e instanceof GoogleDriveError ? e.message : undefined,
                variant: 'danger',
              })
            })
        },
      },
    })
    return
  }

  backupToDrive()
    .then((result) => {
      if (!('conflict' in result)) return
      // This device hasn't reconciled with an existing remote backup yet -
      // never push over it automatically. Point the user at the one place
      // that can resolve it, once per session rather than on every change.
      if (conflictNoticeShown) return
      conflictNoticeShown = true
      toast({
        title: 'Drive’da senkronize edilmemiş bir yedek var',
        description: 'Otomatik yedekleme, üzerine yazmamak için durdu. Önce Veri Yönetimi’nden incele.',
        action: { label: 'Veri Yönetimi', onClick: () => { window.location.hash = ROUTES.dataManagement } },
      })
    })
    .catch(() => {
      // Best-effort background sync - a real, persistent failure surfaces the
      // next time the user backs up explicitly from Veri Yönetimi.
    })
}

function scheduleBackup() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(attemptBackup, DEBOUNCE_MS)
}

/** Call once at app boot (after store hydration). Safe to call more than
 * once - only the first call wires up the subscriptions. */
export function startAutoSync(): void {
  if (started) return
  started = true
  useLibraryStore.subscribe(scheduleBackup)
  useRatingsStore.subscribe(scheduleBackup)
  useListsStore.subscribe(scheduleBackup)
  useProfileStore.subscribe(scheduleBackup)
}
