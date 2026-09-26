import { SNAPSHOT_SCHEMA, type SyncSnapshot } from '@/services/storage/repository'

/** A snapshot is JSON, gzipped when the browser can (every current one
 * can) - watch history is very repetitive text and shrinks ~10x. Reading
 * accepts either, told apart by gzip's magic bytes. */

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function encodeSnapshot(snapshot: SyncSnapshot): Promise<Uint8Array> {
  const json = new TextEncoder().encode(JSON.stringify(snapshot))
  if (typeof CompressionStream === 'undefined') return json
  return pipe(json, new CompressionStream('gzip'))
}

export class SnapshotFormatError extends Error {}

export async function decodeSnapshot(bytes: Uint8Array): Promise<SyncSnapshot> {
  let data = bytes
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream === 'undefined') {
      throw new SnapshotFormatError('Bu tarayıcı Drive’daki veriyi açamıyor. Lütfen tarayıcını güncelle.')
    }
    data = await pipe(bytes, new DecompressionStream('gzip'))
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(data))
  } catch {
    throw new SnapshotFormatError('Drive’daki veri dosyası okunamadı.')
  }
  const snapshot = parsed as Partial<SyncSnapshot> | null
  if (!snapshot || snapshot.app !== 'movie-tracker' || typeof snapshot.epoch !== 'string' || typeof snapshot.tables !== 'object') {
    throw new SnapshotFormatError('Drive’daki veri dosyası tanınmadı.')
  }
  if (typeof snapshot.schema !== 'number' || snapshot.schema > SNAPSHOT_SCHEMA) {
    // Written by a newer version of the app - merging it with this older
    // code could drop fields it doesn't know about. Wait for the update.
    throw new SnapshotFormatError('Verin uygulamanın daha yeni bir sürümüyle kaydedilmiş. Sayfayı yenileyerek güncelle.')
  }
  return { ...snapshot, media: Array.isArray(snapshot.media) ? snapshot.media : [] } as SyncSnapshot
}
