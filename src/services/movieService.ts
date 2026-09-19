import { isLiveDataConfigured } from '@/api/tmdb/client'
import * as tmdb from '@/api/tmdb/movieApi'
import { demoCatalog, getMovieDetail as getDemoMovieDetail } from '@/data/catalog'
import type { MovieDetail } from '@/types/media'
import type { MovieService } from './types'

function isDemoId(mediaId: string): boolean {
  return mediaId.startsWith('movie-demo-')
}

export const movieService: MovieService = {
  async getPopular() {
    return isLiveDataConfigured() ? tmdb.fetchPopularMovies() : demoCatalog.movies.popular()
  },
  async getTopRated() {
    return isLiveDataConfigured() ? tmdb.fetchTopRatedMovies() : demoCatalog.movies.topRated()
  },
  async getTrending() {
    return isLiveDataConfigured() ? tmdb.fetchTrendingMovies() : demoCatalog.movies.trending()
  },
  async getUpcoming() {
    return isLiveDataConfigured() ? tmdb.fetchUpcomingMovies() : demoCatalog.movies.upcoming()
  },
  async getNowPlaying() {
    return isLiveDataConfigured() ? tmdb.fetchNowPlayingMovies() : demoCatalog.movies.nowPlaying()
  },
  async getDetail(mediaId): Promise<MovieDetail | null> {
    if (isDemoId(mediaId) || !isLiveDataConfigured()) return getDemoMovieDetail(mediaId)
    return tmdb.fetchMovieDetail(mediaId)
  },
}
