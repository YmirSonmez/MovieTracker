import { useLibraryStore } from './libraryStore'
import { useRatingsStore } from './ratingsStore'
import { useListsStore } from './listsStore'
import { useProfileStore } from './profileStore'
import { useMediaCacheStore } from './mediaCacheStore'

/** Hydrates every persisted store from IndexedDB in parallel. Call once, on
 * app boot, before rendering anything that reads from these stores. */
export async function hydrateAllStores(): Promise<void> {
  await Promise.all([
    useLibraryStore.getState().hydrate(),
    useRatingsStore.getState().hydrate(),
    useListsStore.getState().hydrate(),
    useProfileStore.getState().hydrate(),
    useMediaCacheStore.getState().hydrate(),
  ])
}
