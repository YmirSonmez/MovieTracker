import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, EmptyState } from '@/components/ui'
import { ROUTES } from '@/utils/routes'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState
        icon={Compass}
        title="Sayfa bulunamadı"
        description="Aradığın sayfa taşınmış ya da hiç var olmamış olabilir."
        action={
          <Button asChild>
            <Link to={ROUTES.home}>Ana sayfaya dön</Link>
          </Button>
        }
      />
    </div>
  )
}
