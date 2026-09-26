import { memo } from 'react'
import { Avatar } from '@/components/ui'
import type { CastMember } from '@/types/media'

export const CastRail = memo(function CastRail({ cast }: { cast: CastMember[] }) {
  if (cast.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-text">Oyuncular</h2>
      <div className="rail-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {cast.slice(0, 15).map((person) => (
          <div key={person.id} className="flex w-24 shrink-0 flex-col items-center gap-2 text-center">
            <Avatar name={person.name} imageUrl={person.profilePath} size="lg" />
            <div>
              <p className="truncate text-xs font-medium text-text">{person.name}</p>
              <p className="truncate text-[11px] text-text-subtle">{person.character}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
})
