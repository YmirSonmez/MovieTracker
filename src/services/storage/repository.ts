import { getDB } from './db'
import type {
  CustomList,
  EpisodeProgress,
  FavoritePerson,
  LibraryEntry,
  Rating,
  Review,
  WatchRecord,
} from '@/types/watch'
import type { MediaSummary } from '@/types/media'
import type { ApiConfig, CloudSyncMeta, UserProfile, UserSettings } from '@/types/user'

/**
 * The only module in the app allowed to know that IndexedDB exists.
 * Stores (src/store) call these functions and hold the reactive copy in
 * memory; components never import this file directly.
 */
export const storage = {
  async getAllLibraryEntries(): Promise<LibraryEntry[]> {
    return (await getDB()).getAll('libraryEntries')
  },
  async putLibraryEntry(entry: LibraryEntry): Promise<void> {
    await (await getDB()).put('libraryEntries', entry)
  },
  async deleteLibraryEntry(id: string): Promise<void> {
    await (await getDB()).delete('libraryEntries', id)
  },

  async getAllWatchRecords(): Promise<WatchRecord[]> {
    return (await getDB()).getAll('watchRecords')
  },
  async putWatchRecord(record: WatchRecord): Promise<void> {
    await (await getDB()).put('watchRecords', record)
  },
  async deleteWatchRecord(id: string): Promise<void> {
    await (await getDB()).delete('watchRecords', id)
  },
  async deleteWatchRecordsForMedia(mediaId: string): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('watchRecords', 'readwrite')
    const keys = await tx.store.index('by-mediaId').getAllKeys(mediaId)
    await Promise.all(keys.map((key) => tx.store.delete(key)))
    await tx.done
  },

  async getAllEpisodeProgress(): Promise<EpisodeProgress[]> {
    return (await getDB()).getAll('episodeProgress')
  },
  async putEpisodeProgress(progress: EpisodeProgress): Promise<void> {
    await (await getDB()).put('episodeProgress', progress)
  },
  async putEpisodeProgressBatch(items: EpisodeProgress[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('episodeProgress', 'readwrite')
    await Promise.all(items.map((item) => tx.store.put(item)))
    await tx.done
  },

  async getAllRatings(): Promise<Rating[]> {
    return (await getDB()).getAll('ratings')
  },
  async putRating(rating: Rating): Promise<void> {
    await (await getDB()).put('ratings', rating)
  },
  async deleteRating(id: string): Promise<void> {
    await (await getDB()).delete('ratings', id)
  },

  async getAllReviews(): Promise<Review[]> {
    return (await getDB()).getAll('reviews')
  },
  async putReview(review: Review): Promise<void> {
    await (await getDB()).put('reviews', review)
  },
  async deleteReview(id: string): Promise<void> {
    await (await getDB()).delete('reviews', id)
  },

  async getAllFavoritePeople(): Promise<FavoritePerson[]> {
    return (await getDB()).getAll('favoritePeople')
  },
  async putFavoritePerson(favorite: FavoritePerson): Promise<void> {
    await (await getDB()).put('favoritePeople', favorite)
  },
  async deleteFavoritePerson(id: string): Promise<void> {
    await (await getDB()).delete('favoritePeople', id)
  },

  async getAllLists(): Promise<CustomList[]> {
    return (await getDB()).getAll('lists')
  },
  async putList(list: CustomList): Promise<void> {
    await (await getDB()).put('lists', list)
  },
  async deleteList(id: string): Promise<void> {
    await (await getDB()).delete('lists', id)
  },

  async getAllMediaCache(): Promise<MediaSummary[]> {
    return (await getDB()).getAll('mediaCache')
  },
  async cacheMedia(items: MediaSummary[]): Promise<void> {
    if (items.length === 0) return
    const db = await getDB()
    const tx = db.transaction('mediaCache', 'readwrite')
    await Promise.all(items.map((item) => tx.store.put(item)))
    await tx.done
  },

  async getProfile(): Promise<UserProfile | undefined> {
    return (await getDB()).get('meta', 'profile') as Promise<UserProfile | undefined>
  },
  async putProfile(profile: UserProfile): Promise<void> {
    await (await getDB()).put('meta', profile, 'profile')
  },

  async getSettings(): Promise<UserSettings | undefined> {
    return (await getDB()).get('meta', 'settings') as Promise<UserSettings | undefined>
  },
  async putSettings(settings: UserSettings): Promise<void> {
    await (await getDB()).put('meta', settings, 'settings')
  },

  async getApiConfig(): Promise<ApiConfig | undefined> {
    return (await getDB()).get('meta', 'apiConfig') as Promise<ApiConfig | undefined>
  },
  async putApiConfig(config: ApiConfig): Promise<void> {
    await (await getDB()).put('meta', config, 'apiConfig')
  },

  async getCloudSyncMeta(): Promise<CloudSyncMeta | undefined> {
    return (await getDB()).get('meta', 'cloudSync') as Promise<CloudSyncMeta | undefined>
  },
  async putCloudSyncMeta(meta: CloudSyncMeta): Promise<void> {
    await (await getDB()).put('meta', meta, 'cloudSync')
  },

  /** Wipes every locally stored table. Used only after an explicit,
   * confirmed "delete all local data" action - never called implicitly. */
  async clearAll(): Promise<void> {
    const db = await getDB()
    const storeNames: Array<keyof typeof db.objectStoreNames extends never ? never : string> = [
      'libraryEntries',
      'watchRecords',
      'episodeProgress',
      'ratings',
      'reviews',
      'favoritePeople',
      'lists',
      'mediaCache',
      'meta',
    ]
    const tx = db.transaction(storeNames as never, 'readwrite')
    await Promise.all(storeNames.map((name) => tx.objectStore(name as never).clear()))
    await tx.done
  },

  /** Replaces every table's contents atomically. Used by "Replace existing
   * data" on import. */
  async replaceAll(data: {
    libraryEntries: LibraryEntry[]
    watchRecords: WatchRecord[]
    episodeProgress: EpisodeProgress[]
    ratings: Rating[]
    reviews: Review[]
    favoritePeople: FavoritePerson[]
    lists: CustomList[]
    mediaCache: MediaSummary[]
    profile: UserProfile
    settings: UserSettings
    apiConfig?: ApiConfig
  }): Promise<void> {
    await this.clearAll()
    const db = await getDB()
    const tx = db.transaction(
      ['libraryEntries', 'watchRecords', 'episodeProgress', 'ratings', 'reviews', 'favoritePeople', 'lists', 'mediaCache', 'meta'],
      'readwrite',
    )
    await Promise.all([
      ...data.libraryEntries.map((e) => tx.objectStore('libraryEntries').put(e)),
      ...data.watchRecords.map((e) => tx.objectStore('watchRecords').put(e)),
      ...data.episodeProgress.map((e) => tx.objectStore('episodeProgress').put(e)),
      ...data.ratings.map((e) => tx.objectStore('ratings').put(e)),
      ...data.reviews.map((e) => tx.objectStore('reviews').put(e)),
      ...data.favoritePeople.map((e) => tx.objectStore('favoritePeople').put(e)),
      ...data.lists.map((e) => tx.objectStore('lists').put(e)),
      ...data.mediaCache.map((e) => tx.objectStore('mediaCache').put(e)),
      tx.objectStore('meta').put(data.profile, 'profile'),
      tx.objectStore('meta').put(data.settings, 'settings'),
      ...(data.apiConfig ? [tx.objectStore('meta').put(data.apiConfig, 'apiConfig')] : []),
    ])
    await tx.done
  },
}
