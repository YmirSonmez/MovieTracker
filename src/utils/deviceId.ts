const DEVICE_ID_KEY = 'movie-tracker-device-id'

/**
 * A stable per-browser identifier, persisted in localStorage - not an
 * account, not a secret, just lets a synced backup say "which device last
 * wrote this" so two devices' conflicting writes can be told apart from a
 * device simply re-uploading its own earlier state. Generated once and
 * reused for the lifetime of this browser profile.
 */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
    return id
  } catch {
    // Storage blocked (private browsing) - a fresh id every call just means
    // this device never "matches" a remembered remote state, which costs an
    // extra review prompt on sync, never data loss.
    return crypto.randomUUID()
  }
}
