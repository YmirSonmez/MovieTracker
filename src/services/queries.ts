import { isLiveDataConfigured } from '@/api/tmdb/client'
import { movieService } from './movieService'
import { tvService } from './tvService'
import { searchService } from './searchService'
import type { QueryDef } from './queryCache'
import type { MultiSearchResults } from './types'
import type { DiscoverParams, MediaSummary, MovieDetail, TVShowDetail } from '@/types/media'

/**
 * Every cached catalog read, defined once - the page that shows it and the
 * card that prefetches it on a tap must agree on the key.
 *
 * Keys carry the data source (live TMDB vs. the bundled demo catalog), so
 * adding or removing a TMDB key never serves the other source's results.
 * Only live data goes to disk; the demo catalog is instant anyway.
 */

const MINUTE = 60_000

function source(): 'live' | 'demo' {
  return isLiveDataConfigured() ? 'live' : 'demo'
}

function def<T>(key: string, fetch: () => Promise<T>, staleAfter: number, onDisk = true): QueryDef<T> {
  const live = source() === 'live'
  return { key: `${source()}:${key}`, fetch, staleAfter, persist: onDisk && live }
}

export type MovieListKind = 'trending' | 'popular' | 'topRated' | 'nowPlaying' | 'upcoming'
export type TVListKind = 'trending' | 'popular' | 'topRated' | 'onTheAir'

const movieLists: Record<MovieListKind, (page: number) => Promise<MediaSummary[]>> = {
  trending: (page) => movieService.getTrending(page),
  popular: (page) => movieService.getPopular(page),
  topRated: (page) => movieService.getTopRated(page),
  nowPlaying: (page) => movieService.getNowPlaying(page),
  upcoming: (page) => movieService.getUpcoming(page),
}

const tvLists: Record<TVListKind, (page: number) => Promise<MediaSummary[]>> = {
  trending: (page) => tvService.getTrending(page),
  popular: (page) => tvService.getPopular(page),
  topRated: (page) => tvService.getTopRated(page),
  onTheAir: (page) => tvService.getOnTheAir(page),
}

export const queries = {
  movieDetail: (id: string): QueryDef<MovieDetail | null> => def(`movie:${id}`, () => movieService.getDetail(id), 30 * MINUTE),
  showDetail: (id: string): QueryDef<TVShowDetail | null> => def(`tv:${id}`, () => tvService.getDetail(id), 30 * MINUTE),
  movieList: (kind: MovieListKind, page = 1): QueryDef<MediaSummary[]> =>
    def(`movies:${kind}:${page}`, () => movieLists[kind](page), 15 * MINUTE),
  tvList: (kind: TVListKind, page = 1): QueryDef<MediaSummary[]> => def(`tvs:${kind}:${page}`, () => tvLists[kind](page), 15 * MINUTE),
  /** One page of Discover's filtered results; 'all' mixes movies and shows. */
  discover: (type: 'movie' | 'tv' | 'all', params: DiscoverParams, page = 1): QueryDef<MediaSummary[]> =>
    def(
      `discover:${type}:${JSON.stringify(params)}:${page}`,
      async () => {
        const tasks: Promise<MediaSummary[]>[] = []
        if (type !== 'tv') tasks.push(movieService.discover(params, page))
        if (type !== 'movie') tasks.push(tvService.discover(params, page))
        return (await Promise.all(tasks)).flat()
      },
      15 * MINUTE,
    ),
  search: (query: string): QueryDef<MultiSearchResults> => def(`search:${query.toLocaleLowerCase('tr')}`, () => searchService.searchAll(query), 10 * MINUTE, false),
}
