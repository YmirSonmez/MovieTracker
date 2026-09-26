import { APP_NAME } from '@/utils/constants'

export function BootSplash({ message }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <svg width="40" height="40" viewBox="0 0 100 100" className="animate-pulse" aria-hidden="true">
        <rect width="100" height="100" rx="24" fill="#16161a" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="#f0a93a" strokeWidth="8" strokeLinecap="round" strokeDasharray="90 201" />
        <path d="M42 35 L68 50 L42 65 Z" fill="#f0a93a" />
      </svg>
      <p className="font-mono text-xs uppercase tracking-widest text-text-subtle">{APP_NAME}</p>
      {message && (
        <p role="status" className="text-sm text-text-muted">
          {message}
        </p>
      )}
    </div>
  )
}
