import type { Genre } from '@/types/media'

/** Mirrors real TMDB genre ids/names so genre-based recommendations and
 * statistics keep working unchanged if a TMDB key is added later. */
export const MOVIE_GENRES: Genre[] = [
  { id: 28, name: 'Aksiyon' },
  { id: 12, name: 'Macera' },
  { id: 16, name: 'Animasyon' },
  { id: 35, name: 'Komedi' },
  { id: 80, name: 'Suç' },
  { id: 18, name: 'Dram' },
  { id: 14, name: 'Fantastik' },
  { id: 27, name: 'Korku' },
  { id: 9648, name: 'Gizem' },
  { id: 10749, name: 'Romantik' },
  { id: 878, name: 'Bilim Kurgu' },
  { id: 53, name: 'Gerilim' },
  { id: 10752, name: 'Savaş' },
]

export const TV_GENRES: Genre[] = [
  { id: 10759, name: 'Aksiyon ve Macera' },
  { id: 16, name: 'Animasyon' },
  { id: 35, name: 'Komedi' },
  { id: 80, name: 'Suç' },
  { id: 18, name: 'Dram' },
  { id: 9648, name: 'Gizem' },
  { id: 10765, name: 'Bilim Kurgu ve Fantastik' },
]

const ALL_GENRES = [...MOVIE_GENRES, ...TV_GENRES]

export function genreName(id: number): string {
  return ALL_GENRES.find((g) => g.id === id)?.name ?? 'Diğer'
}

export function genresFor(ids: number[]): Genre[] {
  return ids.map((id) => ({ id, name: genreName(id) }))
}
