/** Raw TMDB v3 API shapes - only the fields this app actually reads.
 * Nothing outside src/api/tmdb should import from this file; go through
 * src/services instead. */

export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBPaginated<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export interface TMDBMovieSummary {
  id: number
  title: string
  original_title?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string | null
  vote_average: number
  genre_ids?: number[]
}

export interface TMDBMovieDetail extends TMDBMovieSummary {
  runtime: number | null
  genres: TMDBGenre[]
  production_countries?: { iso_3166_1: string; name: string }[]
  credits?: TMDBCredits
  similar?: TMDBPaginated<TMDBMovieSummary>
  recommendations?: TMDBPaginated<TMDBMovieSummary>
}

export interface TMDBTVSummary {
  id: number
  name: string
  original_name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string | null
  vote_average: number
  genre_ids?: number[]
}

export interface TMDBTVDetail extends TMDBTVSummary {
  last_air_date: string | null
  status: string
  networks?: { name: string }[]
  number_of_seasons: number
  number_of_episodes: number
  genres: TMDBGenre[]
  seasons: TMDBSeasonSummary[]
  credits?: TMDBCredits
  similar?: TMDBPaginated<TMDBTVSummary>
  recommendations?: TMDBPaginated<TMDBTVSummary>
}

export interface TMDBSeasonSummary {
  id: number
  season_number: number
  name: string
  overview: string
  poster_path: string | null
  air_date: string | null
  episode_count: number
}

export interface TMDBSeasonDetail extends TMDBSeasonSummary {
  episodes: TMDBEpisode[]
}

export interface TMDBEpisode {
  id: number
  season_number: number
  episode_number: number
  name: string
  overview: string
  air_date: string | null
  runtime: number | null
  still_path: string | null
}

export interface TMDBCastMember {
  id: number
  name: string
  character: string
  order: number
  profile_path: string | null
  known_for_department?: string
}

export interface TMDBCrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
  known_for_department?: string
}

export interface TMDBCredits {
  cast: TMDBCastMember[]
  crew: TMDBCrewMember[]
}

export interface TMDBPersonSearchResult {
  id: number
  name: string
  profile_path: string | null
  known_for_department?: string
}

export type TMDBMultiSearchResult =
  | (TMDBMovieSummary & { media_type: 'movie' })
  | (TMDBTVSummary & { media_type: 'tv' })
  | (TMDBPersonSearchResult & { media_type: 'person' })
