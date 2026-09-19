export function generateId(): string {
  return crypto.randomUUID()
}

export function episodeProgressId(showId: string, seasonNumber: number, episodeNumber: number): string {
  return `${showId}-s${seasonNumber}e${episodeNumber}`
}
