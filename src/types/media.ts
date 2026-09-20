/** Internal, provider-agnostic media models. Nothing outside src/services and
 * src/api should ever see a raw TMDB (or any other provider) shape. */

export type MediaType = 'movie' | 'tv'

export interface Genre {
  id: number
  name: string
}

/** Criteria for a filtered, paginated browse (Discover's genre/year/rating
 * filters) - shared by the api and services layers so neither has to depend
 * on the other's types module. */
export interface DiscoverParams {
  genreId?: number
  year?: number
  minRating?: number
  sort: 'popularity' | 'rating' | 'year'
}

export interface Person {
  id: string
  name: string
  profilePath: string | null
  knownForDepartment?: string
}

export interface CastMember extends Person {
  character: string
  order: number
}

export interface CrewMember extends Person {
  job: string
  department: string
}

/** Lightweight shape used in grids, carousels, search results, and the
 * local media metadata cache. Cheap to store thousands of. */
export interface MediaSummary {
  id: string
  mediaType: MediaType
  title: string
  originalTitle?: string
  overview: string
  posterPath: string | null
  backdropPath: string | null
  year: number | null
  voteAverage: number | null
  genreIds: number[]
  /** Movie runtime, or a show's average episode runtime - populated when
   * available so Library can sort by it without re-fetching detail. */
  runtimeMinutes?: number
}

export interface Episode {
  id: string
  showId: string
  seasonNumber: number
  episodeNumber: number
  name: string
  overview: string
  airDate: string | null
  runtime: number | null
  stillPath: string | null
}

export interface Season {
  id: string
  showId: string
  seasonNumber: number
  name: string
  overview: string
  posterPath: string | null
  airDate: string | null
  episodeCount: number
  episodes: Episode[]
}

export interface MovieDetail extends MediaSummary {
  mediaType: 'movie'
  runtime: number | null
  releaseDate: string | null
  genres: Genre[]
  director: CrewMember | null
  cast: CastMember[]
  crew: CrewMember[]
  similar: MediaSummary[]
  recommendations: MediaSummary[]
  productionCountries: string[]
}

export type TVStatus = 'returning' | 'ended' | 'canceled' | 'in_production' | 'planned' | 'unknown'

export interface TVShowDetail extends MediaSummary {
  mediaType: 'tv'
  firstAirDate: string | null
  lastAirDate: string | null
  status: TVStatus
  network: string | null
  numberOfSeasons: number
  numberOfEpisodes: number
  genres: Genre[]
  cast: CastMember[]
  crew: CrewMember[]
  seasons: Season[]
  similar: MediaSummary[]
  recommendations: MediaSummary[]
}

export type MediaDetail = MovieDetail | TVShowDetail

export function isMovie(detail: MediaDetail): detail is MovieDetail {
  return detail.mediaType === 'movie'
}

export function isTVShow(detail: MediaDetail): detail is TVShowDetail {
  return detail.mediaType === 'tv'
}
