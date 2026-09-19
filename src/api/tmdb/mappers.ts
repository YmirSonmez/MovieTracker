import { tmdbImageUrl } from './client'
import type {
  TMDBCastMember,
  TMDBCredits,
  TMDBCrewMember,
  TMDBEpisode,
  TMDBMovieDetail,
  TMDBMovieSummary,
  TMDBSeasonDetail,
  TMDBTVDetail,
  TMDBTVSummary,
} from './types'
import type {
  CastMember,
  CrewMember,
  Episode,
  MediaSummary,
  MovieDetail,
  Season,
  TVShowDetail,
  TVStatus,
} from '@/types/media'

function yearFrom(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const year = Number(dateStr.slice(0, 4))
  return Number.isFinite(year) ? year : null
}

export function mapMovieSummary(raw: TMDBMovieSummary): MediaSummary {
  return {
    id: `movie-${raw.id}`,
    mediaType: 'movie',
    title: raw.title,
    originalTitle: raw.original_title,
    overview: raw.overview,
    posterPath: tmdbImageUrl(raw.poster_path, 'w500'),
    backdropPath: tmdbImageUrl(raw.backdrop_path, 'w1280'),
    year: yearFrom(raw.release_date),
    voteAverage: raw.vote_average,
    genreIds: raw.genre_ids ?? [],
  }
}

export function mapTVSummary(raw: TMDBTVSummary): MediaSummary {
  return {
    id: `tv-${raw.id}`,
    mediaType: 'tv',
    title: raw.name,
    originalTitle: raw.original_name,
    overview: raw.overview,
    posterPath: tmdbImageUrl(raw.poster_path, 'w500'),
    backdropPath: tmdbImageUrl(raw.backdrop_path, 'w1280'),
    year: yearFrom(raw.first_air_date),
    voteAverage: raw.vote_average,
    genreIds: raw.genre_ids ?? [],
  }
}

function mapCast(credits?: TMDBCredits): CastMember[] {
  if (!credits) return []
  return credits.cast.slice(0, 20).map(
    (c: TMDBCastMember): CastMember => ({
      id: `person-${c.id}`,
      name: c.name,
      profilePath: tmdbImageUrl(c.profile_path, 'w185'),
      knownForDepartment: c.known_for_department,
      character: c.character,
      order: c.order,
    }),
  )
}

function mapCrew(credits?: TMDBCredits): CrewMember[] {
  if (!credits) return []
  return credits.crew.slice(0, 20).map(
    (c: TMDBCrewMember): CrewMember => ({
      id: `person-${c.id}`,
      name: c.name,
      profilePath: tmdbImageUrl(c.profile_path, 'w185'),
      knownForDepartment: c.known_for_department,
      job: c.job,
      department: c.department,
    }),
  )
}

function findDirector(credits?: TMDBCredits): CrewMember | null {
  const crew = mapCrew(credits)
  return crew.find((c) => c.job === 'Director') ?? null
}

export function mapMovieDetail(raw: TMDBMovieDetail): MovieDetail {
  return {
    ...mapMovieSummary(raw),
    mediaType: 'movie',
    runtime: raw.runtime,
    releaseDate: raw.release_date,
    genres: raw.genres,
    director: findDirector(raw.credits),
    cast: mapCast(raw.credits),
    crew: mapCrew(raw.credits),
    similar: (raw.similar?.results ?? []).map(mapMovieSummary),
    recommendations: (raw.recommendations?.results ?? []).map(mapMovieSummary),
    productionCountries: (raw.production_countries ?? []).map((c) => c.name),
  }
}

const TV_STATUS_MAP: Record<string, TVStatus> = {
  'Returning Series': 'returning',
  Ended: 'ended',
  Canceled: 'canceled',
  'In Production': 'in_production',
  Planned: 'planned',
  Pilot: 'planned',
}

export function mapEpisode(showId: string, raw: TMDBEpisode): Episode {
  return {
    id: `${showId}-s${raw.season_number}e${raw.episode_number}`,
    showId,
    seasonNumber: raw.season_number,
    episodeNumber: raw.episode_number,
    name: raw.name,
    overview: raw.overview,
    airDate: raw.air_date,
    runtime: raw.runtime,
    stillPath: tmdbImageUrl(raw.still_path, 'w300'),
  }
}

export function mapSeasonDetail(showId: string, raw: TMDBSeasonDetail): Season {
  return {
    id: `${showId}-s${raw.season_number}`,
    showId,
    seasonNumber: raw.season_number,
    name: raw.name,
    overview: raw.overview,
    posterPath: tmdbImageUrl(raw.poster_path, 'w342'),
    airDate: raw.air_date,
    episodeCount: raw.episode_count,
    episodes: raw.episodes.map((ep) => mapEpisode(showId, ep)),
  }
}

export function mapTVDetail(raw: TMDBTVDetail, seasons: Season[]): TVShowDetail {
  return {
    ...mapTVSummary(raw),
    mediaType: 'tv',
    firstAirDate: raw.first_air_date,
    lastAirDate: raw.last_air_date,
    status: TV_STATUS_MAP[raw.status] ?? 'unknown',
    network: raw.networks?.[0]?.name ?? null,
    numberOfSeasons: raw.number_of_seasons,
    numberOfEpisodes: raw.number_of_episodes,
    genres: raw.genres,
    cast: mapCast(raw.credits),
    crew: mapCrew(raw.credits),
    seasons,
    similar: (raw.similar?.results ?? []).map(mapTVSummary),
    recommendations: (raw.recommendations?.results ?? []).map(mapTVSummary),
  }
}
