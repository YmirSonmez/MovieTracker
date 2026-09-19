import { ALL_DETAILS } from '@/data/catalog'
import type { Person } from '@/types/media'
import type { PeopleService } from './types'

/** Minimal today: resolves people that appear in the local catalog (demo
 * cast/crew, or anything already cached from a live detail fetch). Full
 * person detail pages (bio, filmography) are a follow-up - see README
 * roadmap - so this only needs to answer "who is this" for now. */
export const peopleService: PeopleService = {
  async getPersonDetail(personId) {
    for (const detail of ALL_DETAILS) {
      const found = [
        ...('cast' in detail ? detail.cast : []),
        ...('crew' in detail ? detail.crew : []),
        ...('director' in detail && detail.director ? [detail.director] : []),
      ].find((p) => p.id === personId)
      if (found) return found as Person
    }
    return null
  },
}
