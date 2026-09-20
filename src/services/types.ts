import type { DiscoverParams, MediaSummary, MovieDetail, Person, TVShowDetail } from '@/types/media'

export interface MovieService {
  getPopular(page?: number): Promise<MediaSummary[]>
  getTopRated(page?: number): Promise<MediaSummary[]>
  getTrending(page?: number): Promise<MediaSummary[]>
  getUpcoming(page?: number): Promise<MediaSummary[]>
  getNowPlaying(page?: number): Promise<MediaSummary[]>
  discover(params: DiscoverParams, page?: number): Promise<MediaSummary[]>
  getDetail(mediaId: string): Promise<MovieDetail | null>
}

export interface TVService {
  getPopular(page?: number): Promise<MediaSummary[]>
  getTopRated(page?: number): Promise<MediaSummary[]>
  getTrending(page?: number): Promise<MediaSummary[]>
  getOnTheAir(page?: number): Promise<MediaSummary[]>
  discover(params: DiscoverParams, page?: number): Promise<MediaSummary[]>
  getDetail(mediaId: string): Promise<TVShowDetail | null>
}

export interface MultiSearchResults {
  movies: MediaSummary[]
  shows: MediaSummary[]
  people: Person[]
}

export interface SearchService {
  searchAll(query: string): Promise<MultiSearchResults>
}

export interface PeopleService {
  getPersonDetail(personId: string): Promise<Person | null>
}
