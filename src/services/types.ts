import type { MediaSummary, MovieDetail, Person, TVShowDetail } from '@/types/media'

export interface DiscoverFilters {
  genreId?: number
  year?: number
  minRating?: number
  language?: string
}

export interface MovieService {
  getPopular(): Promise<MediaSummary[]>
  getTopRated(): Promise<MediaSummary[]>
  getTrending(): Promise<MediaSummary[]>
  getUpcoming(): Promise<MediaSummary[]>
  getNowPlaying(): Promise<MediaSummary[]>
  getDetail(mediaId: string): Promise<MovieDetail | null>
}

export interface TVService {
  getPopular(): Promise<MediaSummary[]>
  getTopRated(): Promise<MediaSummary[]>
  getTrending(): Promise<MediaSummary[]>
  getOnTheAir(): Promise<MediaSummary[]>
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
