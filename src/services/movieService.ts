import { isLiveDataConfigured } from '@/api/tmdb/client'
import * as tmdb from '@/api/tmdb/movieApi'
import { demoCatalog, discoverDemoCatalog, getMovieDetail as getDemoMovieDetail } from '@/data/catalog'
import type { DiscoverParams, MovieDetail } from '@/types/media'
import type { MovieService } from './types'

function isDemoId(mediaId: string): boolean {
  return mediaId.startsWith('movie-demo-')
}

// The demo catalog is a small, fixed set of titles - it has exactly one
// "page" of results per category. Reporting an empty page 2+ (rather than
// repeating page 1) is what lets a "load more" UI correctly stop offering
// more once that page is reached, instead of looping forever.
function demoPage<T>(items: T[], page: number): T[] {
  return page > 1 ? [] : items
}

export const movieService: MovieService = {
  async getPopular(page = 1) {
    return isLiveDataConfigured() ? tmdb.fetchPopularMovies(page) : demoPage(demoCatalog.movies.popular(), page)
  },
  async getTopRated(page = 1) {
    return isLiveDataConfigured() ? tmdb.fetchTopRatedMovies(page) : demoPage(demoCatalog.movies.topRated(), page)
  },
  async getTrending(page = 1) {
    return isLiveDataConfigured() ? tmdb.fetchTrendingMovies(page) : demoPage(demoCatalog.movies.trending(), page)
  },
  async getUpcoming(page = 1) {
    return isLiveDataConfigured() ? tmdb.fetchUpcomingMovies(page) : demoPage(demoCatalog.movies.upcoming(), page)
  },
  async getNowPlaying(page = 1) {
    return isLiveDataConfigured() ? tmdb.fetchNowPlayingMovies(page) : demoPage(demoCatalog.movies.nowPlaying(), page)
  },
  async discover(params: DiscoverParams, page = 1) {
    return isLiveDataConfigured()
      ? tmdb.fetchDiscoverMovies(params, page)
      : demoPage(discoverDemoCatalog(demoCatalog.movies.popular(), params), page)
  },
  async getDetail(mediaId): Promise<MovieDetail | null> {
    if (isDemoId(mediaId) || !isLiveDataConfigured()) return getDemoMovieDetail(mediaId)
    return tmdb.fetchMovieDetail(mediaId)
  },
}
