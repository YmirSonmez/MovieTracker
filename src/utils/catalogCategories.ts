import { queries, type MovieListKind, type QueryDef, type TVListKind } from '@/services'
import type { MediaSummary } from '@/types/media'

export type CatalogMediaType = 'movie' | 'tv'

export interface CatalogCategory {
  title: string
  page: (page: number) => QueryDef<MediaSummary[]>
}

const MOVIE_TITLES: Record<MovieListKind, string> = {
  trending: 'Bu Hafta Trend Filmler',
  popular: 'Popüler Filmler',
  topRated: 'En Çok Beğenilen Filmler',
  nowPlaying: 'Yeni Vizyona Girenler',
  upcoming: 'Yakında',
}

const TV_TITLES: Record<TVListKind, string> = {
  trending: 'Bu Hafta Trend Diziler',
  popular: 'Popüler Diziler',
  topRated: 'En Çok Beğenilen Diziler',
  onTheAir: 'Yayında Olanlar',
}

export function getCatalogCategory(mediaType: string | undefined, category: string | undefined): CatalogCategory | undefined {
  if (mediaType === 'movie' && category && category in MOVIE_TITLES) {
    const kind = category as MovieListKind
    return { title: MOVIE_TITLES[kind], page: (page) => queries.movieList(kind, page) }
  }
  if (mediaType === 'tv' && category && category in TV_TITLES) {
    const kind = category as TVListKind
    return { title: TV_TITLES[kind], page: (page) => queries.tvList(kind, page) }
  }
  return undefined
}
