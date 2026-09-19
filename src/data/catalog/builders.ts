import { publicUrl } from '@/utils/publicUrl'
import { genresFor } from '../genres'
import type { CastMember, CrewMember, Episode, MediaSummary, MovieDetail, Person, Season, TVShowDetail, TVStatus } from '@/types/media'

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function person(name: string, department?: string): Person {
  return { id: `person-demo-${slugifyName(name)}`, name, profilePath: null, knownForDepartment: department }
}

export function castMember(name: string, character: string, order: number): CastMember {
  return { ...person(name, 'Acting'), character, order }
}

export function crewMember(name: string, job: string, department: string): CrewMember {
  return { ...person(name, department), job, department }
}

export interface MovieSeed {
  slug: string
  title: string
  originalTitle?: string
  year: number
  runtime: number
  genreIds: number[]
  overview: string
  voteAverage: number
  director: string
  cast: string[]
  countries?: string[]
}

export function buildMovie(seed: MovieSeed): MovieDetail {
  const id = `movie-demo-${seed.slug}`
  return {
    id,
    mediaType: 'movie',
    title: seed.title,
    originalTitle: seed.originalTitle ?? seed.title,
    overview: seed.overview,
    posterPath: publicUrl(`posters/${seed.slug}-poster.jpg`),
    backdropPath: publicUrl(`posters/${seed.slug}-backdrop.jpg`),
    year: seed.year,
    voteAverage: seed.voteAverage,
    genreIds: seed.genreIds,
    runtime: seed.runtime,
    releaseDate: `${seed.year}-01-01`,
    genres: genresFor(seed.genreIds),
    director: crewMember(seed.director, 'Director', 'Directing'),
    cast: seed.cast.map((name, i) => castMember(name, 'Karakter', i)),
    crew: [crewMember(seed.director, 'Director', 'Directing')],
    similar: [],
    recommendations: [],
    productionCountries: seed.countries ?? ['United States of America'],
  }
}

export interface EpisodeSeed {
  number: number
  name: string
  overview?: string
  runtime?: number
  airDate?: string
}

export interface SeasonSeed {
  number: number
  name?: string
  episodes: EpisodeSeed[]
}

export interface ShowSeed {
  slug: string
  title: string
  year: number
  genreIds: number[]
  overview: string
  voteAverage: number
  status: TVStatus
  network: string
  cast: string[]
  seasons: SeasonSeed[]
}

export function buildShow(seed: ShowSeed): TVShowDetail {
  const id = `tv-demo-${seed.slug}`
  const seasons: Season[] = seed.seasons.map((s) => {
    const episodes: Episode[] = s.episodes.map((e) => ({
      id: `${id}-s${s.number}e${e.number}`,
      showId: id,
      seasonNumber: s.number,
      episodeNumber: e.number,
      name: e.name,
      overview: e.overview ?? '',
      airDate: e.airDate ?? null,
      runtime: e.runtime ?? 45,
      stillPath: null,
    }))
    return {
      id: `${id}-s${s.number}`,
      showId: id,
      seasonNumber: s.number,
      name: s.name ?? `${s.number}. Sezon`,
      overview: '',
      posterPath: publicUrl(`posters/${seed.slug}-poster.jpg`),
      airDate: episodes[0]?.airDate ?? null,
      episodeCount: episodes.length,
      episodes,
    }
  })

  return {
    id,
    mediaType: 'tv',
    title: seed.title,
    originalTitle: seed.title,
    overview: seed.overview,
    posterPath: publicUrl(`posters/${seed.slug}-poster.jpg`),
    backdropPath: publicUrl(`posters/${seed.slug}-backdrop.jpg`),
    year: seed.year,
    voteAverage: seed.voteAverage,
    genreIds: seed.genreIds,
    firstAirDate: `${seed.year}-01-01`,
    lastAirDate: null,
    status: seed.status,
    network: seed.network,
    numberOfSeasons: seasons.length,
    numberOfEpisodes: seasons.reduce((sum, s) => sum + s.episodes.length, 0),
    genres: genresFor(seed.genreIds),
    cast: seed.cast.map((name, i) => castMember(name, 'Karakter', i)),
    crew: [],
    seasons,
    similar: [],
    recommendations: [],
  }
}

export function toSummary(detail: MovieDetail | TVShowDetail): MediaSummary {
  const { id, mediaType, title, originalTitle, overview, posterPath, backdropPath, year, voteAverage, genreIds } = detail
  return { id, mediaType, title, originalTitle, overview, posterPath, backdropPath, year, voteAverage, genreIds }
}
