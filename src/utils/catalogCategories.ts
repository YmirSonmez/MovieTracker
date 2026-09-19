import { movieService, tvService } from '@/services'
import type { MediaSummary } from '@/types/media'

export type CatalogMediaType = 'movie' | 'tv'

export interface CatalogCategory {
  title: string
  fetchPage: (page: number) => Promise<MediaSummary[]>
}

export const MOVIE_CATEGORIES = {
  trending: { title: 'Bu Hafta Trend Filmler', fetchPage: (page: number) => movieService.getTrending(page) },
  popular: { title: 'Popüler Filmler', fetchPage: (page: number) => movieService.getPopular(page) },
  topRated: { title: 'En Çok Beğenilen Filmler', fetchPage: (page: number) => movieService.getTopRated(page) },
  nowPlaying: { title: 'Yeni Vizyona Girenler', fetchPage: (page: number) => movieService.getNowPlaying(page) },
  upcoming: { title: 'Yakında', fetchPage: (page: number) => movieService.getUpcoming(page) },
} as const satisfies Record<string, CatalogCategory>

export const TV_CATEGORIES = {
  trending: { title: 'Bu Hafta Trend Diziler', fetchPage: (page: number) => tvService.getTrending(page) },
  popular: { title: 'Popüler Diziler', fetchPage: (page: number) => tvService.getPopular(page) },
  topRated: { title: 'En Çok Beğenilen Diziler', fetchPage: (page: number) => tvService.getTopRated(page) },
  onTheAir: { title: 'Yayında Olanlar', fetchPage: (page: number) => tvService.getOnTheAir(page) },
} as const satisfies Record<string, CatalogCategory>

export type MovieCategoryKey = keyof typeof MOVIE_CATEGORIES
export type TVCategoryKey = keyof typeof TV_CATEGORIES

export function getCatalogCategory(mediaType: string | undefined, category: string | undefined): CatalogCategory | undefined {
  if (mediaType === 'movie') return MOVIE_CATEGORIES[category as MovieCategoryKey]
  if (mediaType === 'tv') return TV_CATEGORIES[category as TVCategoryKey]
  return undefined
}
