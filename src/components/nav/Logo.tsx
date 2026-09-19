import { Link } from 'react-router-dom'
import { ROUTES } from '@/utils/routes'
import { APP_NAME } from '@/utils/constants'
import { cn } from '@/utils/cn'

export function Logo({ className }: { className?: string }) {
  return (
    <Link to={ROUTES.home} className={cn('flex items-center gap-2 shrink-0', className)}>
      <svg width="26" height="26" viewBox="0 0 100 100" aria-hidden="true">
        <rect width="100" height="100" rx="24" fill="var(--color-bg)" stroke="var(--color-border)" />
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="176 201"
          transform="rotate(-90 50 50)"
        />
        <path d="M42 35 L68 50 L42 65 Z" fill="var(--color-accent)" />
      </svg>
      <span className="text-base font-bold tracking-tight text-text">{APP_NAME}</span>
    </Link>
  )
}
