import type { MediaSummary } from '@/types/media'
import { MediaCard } from './MediaCard'
import { EmptyState } from '@/components/ui'
import { SearchX } from 'lucide-react'

export function MediaGrid({ items }: { items: MediaSummary[] }) {
  if (items.length === 0) {
    return <EmptyState icon={SearchX} title="Sonuç bulunamadı" description="Filtreleri değiştirip tekrar dene." />
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <MediaCard key={item.id} summary={item} />
      ))}
    </div>
  )
}
