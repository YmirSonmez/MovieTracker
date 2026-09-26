import { toast } from './toastStore'

/**
 * Stores update the screen first and save second, so a tap never waits on
 * a disk write. This is the "save second" half: it awaits the write and,
 * in the rare case it fails (storage full, private mode), tells the user
 * and reloads the store from IndexedDB - the source of truth - so the
 * screen never shows something that isn't actually saved. Never rejects.
 */
export async function persist(write: Promise<unknown>, reload: () => Promise<void>): Promise<void> {
  try {
    await write
  } catch (error) {
    console.error('Write failed', error)
    toast({
      title: 'Değişiklik kaydedilemedi',
      description: 'Cihazdaki depolama alanı dolmuş olabilir. Ekran kaydedilmiş son hâline döndürüldü.',
      variant: 'danger',
    })
    await reload().catch(() => {})
  }
}
