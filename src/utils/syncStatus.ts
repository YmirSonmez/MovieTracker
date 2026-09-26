import type { SyncPhase } from '@/store/syncStore'

export function formatSyncTime(at: number | null, now = Date.now()): string {
  if (!at) return 'henüz eşitlenmedi'
  const minutes = Math.floor((now - at) / 60_000)
  if (minutes < 1) return 'az önce'
  if (minutes < 60) return `${minutes} dk önce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} sa önce`
  return new Date(at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

export function describeSync(phase: SyncPhase, dirty: boolean, lastSyncedAt: number | null, now: number): string {
  switch (phase) {
    case 'syncing':
      return 'Eşitleniyor…'
    case 'offline':
      return dirty ? 'Çevrimdışı · değişiklikler bu cihazda bekliyor' : 'Çevrimdışı'
    case 'needsAuth':
      return 'Google oturumunu yenilemek gerekiyor'
    case 'error':
      return 'Eşitleme sorunu'
    default:
      return dirty ? 'Değişiklikler gönderiliyor…' : `Eşitlendi · ${formatSyncTime(lastSyncedAt, now)}`
  }
}
