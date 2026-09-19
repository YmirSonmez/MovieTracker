import type { LucideIcon } from 'lucide-react'
import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/ui'

interface ComingSoonPageProps {
  title: string
  description?: string
  icon?: LucideIcon
}

export function ComingSoonPage({ title, description, icon }: ComingSoonPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState
        icon={icon ?? Construction}
        title={title}
        description={description ?? 'Bu bölüm yol haritasında; yakında burada olacak.'}
      />
    </div>
  )
}
