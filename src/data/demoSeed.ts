import { useLibraryStore } from '@/store/libraryStore'
import { useRatingsStore } from '@/store/ratingsStore'
import { useListsStore } from '@/store/listsStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { hydrateAllStores } from '@/store/init'
import { storage } from '@/services/storage/repository'
import { ALL_DETAILS, getTVDetail } from './catalog'
import { toSummary } from './catalog/builders'
import { DEMO_DATA_FLAG_KEY } from '@/utils/constants'

const movie = (slug: string) => `movie-demo-${slug}`
const tv = (slug: string) => `tv-demo-${slug}`

export function isDemoDataFlagSet(): boolean {
  try {
    return localStorage.getItem(DEMO_DATA_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

/** Seeds a believable watch history, ratings, watchlist and custom lists
 * over the bundled catalog, so the dashboard/library/stats look complete
 * without requiring the user to track dozens of titles by hand first. Only
 * ever offered from Settings while the library is empty - see
 * ConfirmDialog usage in the Data Management page. */
export async function loadDemoData(): Promise<void> {
  const lib = useLibraryStore.getState()
  const ratings = useRatingsStore.getState()
  const lists = useListsStore.getState()

  await useMediaCacheStore.getState().cache(ALL_DETAILS.map(toSummary))

  const watchedMovies: Array<[string, number]> = [
    [movie('shawshank-redemption'), 5],
    [movie('the-dark-knight'), 5],
    [movie('parasite'), 4.5],
    [movie('inception'), 4.5],
    [movie('pulp-fiction'), 4.5],
    [movie('whiplash'), 4],
    [movie('get-out'), 4],
    [movie('la-la-land'), 3.5],
    [movie('coco'), 4],
    [movie('gone-girl'), 4],
  ]
  for (const [id, rating] of watchedMovies) {
    await lib.markWatched(id, 'movie')
    await ratings.setRating(id, 'movie', rating)
  }

  const breakingBad = getTVDetail(tv('breaking-bad'))
  if (breakingBad) {
    await lib.markSeasonWatched(breakingBad.id, breakingBad.seasons[0])
    await lib.markSeasonWatched(breakingBad.id, breakingBad.seasons[1])
    for (let e = 1; e <= 6; e++) await lib.markEpisodeWatched(breakingBad.id, 3, e)
    await lib.syncShowStatusFromProgress(breakingBad.id, breakingBad.seasons)
    await ratings.setRating(breakingBad.id, 'tv', 5)
  }

  const office = getTVDetail(tv('the-office'))
  if (office) {
    await lib.markSeasonWatched(office.id, office.seasons[0])
    for (let e = 1; e <= 14; e++) await lib.markEpisodeWatched(office.id, 5, e)
    await lib.syncShowStatusFromProgress(office.id, office.seasons)
    await ratings.setRating(office.id, 'tv', 4.5)
  }

  const strangerThings = getTVDetail(tv('stranger-things'))
  if (strangerThings) {
    for (let e = 1; e <= 3; e++) await lib.markEpisodeWatched(strangerThings.id, 1, e)
    await lib.syncShowStatusFromProgress(strangerThings.id, strangerThings.seasons)
  }

  await lib.addToWatchlist(movie('dune'), 'movie', 'high')
  await lib.addToWatchlist(movie('oppenheimer'), 'movie', 'high', 'Sinemada kaçırdım, bu hafta izleyeceğim.')
  await lib.addToWatchlist(movie('everything-everywhere'), 'movie', 'medium')
  await lib.addToWatchlist(tv('money-heist'), 'tv', 'medium')
  await lib.addToWatchlist(tv('dark'), 'tv', 'low')

  await lib.toggleFavorite(movie('parasite'), 'movie')
  await lib.toggleFavorite(movie('the-dark-knight'), 'movie')
  await lib.toggleFavorite(movie('shawshank-redemption'), 'movie')
  if (breakingBad) await lib.toggleFavorite(breakingBad.id, 'tv')

  const top10 = await lists.createList('En İyi 10 Filmim', 'Zaman zaman güncellediğim, gözden geçirdiğim favori listem.')
  for (const slug of ['shawshank-redemption', 'pulp-fiction', 'the-dark-knight', 'parasite', 'inception', 'whiplash']) {
    await lists.addItem(top10.id, movie(slug))
  }

  const nolan = await lists.createList('Christopher Nolan Filmleri', 'Zaman ve gerçeklikle oynamayı seven bir yönetmen.')
  for (const slug of ['inception', 'the-dark-knight', 'interstellar', 'oppenheimer']) {
    await lists.addItem(nolan.id, movie(slug))
  }

  try {
    localStorage.setItem(DEMO_DATA_FLAG_KEY, '1')
  } catch {
    // ignore storage failures, the flag is a label only
  }
}

/** Full local reset. Framed to the user as "clear demo data" but, since
 * loadDemoData is only offered on an empty library, this is equivalent to
 * "reset all local data" - see the Data Management page copy. */
export async function clearDemoData(): Promise<void> {
  await storage.clearAll()
  await hydrateAllStores()
  try {
    localStorage.removeItem(DEMO_DATA_FLAG_KEY)
  } catch {
    // ignore
  }
}
