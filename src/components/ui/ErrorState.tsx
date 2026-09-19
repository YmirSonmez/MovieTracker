import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Bir şeyler ters gitti',
  description = 'Bu içeriği şu anda yükleyemedik. Kaydedilmiş kitaplığın güvende, birazdan tekrar dene.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="max-w-sm text-sm text-text-muted">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Tekrar dene
        </Button>
      )}
    </div>
  )
}
