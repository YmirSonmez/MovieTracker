const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

export type TMDBErrorKind = 'network' | 'rate_limited' | 'not_found' | 'unauthorized' | 'unknown'

export class TMDBError extends Error {
  kind: TMDBErrorKind
  constructor(kind: TMDBErrorKind, message: string) {
    super(message)
    this.name = 'TMDBError'
    this.kind = kind
  }
}

export function getTMDBApiKey(): string | undefined {
  const key = import.meta.env.VITE_TMDB_API_KEY
  return key && key.trim().length > 0 ? key.trim() : undefined
}

export function isLiveDataConfigured(): boolean {
  return Boolean(getTMDBApiKey())
}

export async function tmdbFetch<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const apiKey = getTMDBApiKey()
  if (!apiKey) {
    throw new TMDBError('unauthorized', 'TMDB API key is not configured.')
  }

  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('language', 'tr-TR')
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  let response: Response
  try {
    response = await fetch(url.toString())
  } catch {
    throw new TMDBError('network', 'Ağ bağlantısı kurulamadı.')
  }

  if (response.status === 401 || response.status === 403) {
    throw new TMDBError('unauthorized', 'TMDB API anahtarı geçersiz.')
  }
  if (response.status === 404) {
    throw new TMDBError('not_found', 'İçerik bulunamadı.')
  }
  if (response.status === 429) {
    throw new TMDBError('rate_limited', 'İstek limiti aşıldı, birazdan tekrar dene.')
  }
  if (!response.ok) {
    throw new TMDBError('unknown', `TMDB isteği başarısız oldu (${response.status}).`)
  }

  return (await response.json()) as T
}

export type TMDBImageSize = 'w92' | 'w154' | 'w185' | 'w300' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'

export function tmdbImageUrl(path: string | null, size: TMDBImageSize): string | null {
  if (!path) return null
  return `${IMAGE_BASE_URL}/${size}${path}`
}
