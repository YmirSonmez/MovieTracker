import { cn } from '@/utils/cn'

interface ProgressBarProps {
  percent: number
  className?: string
  trackClassName?: string
  barClassName?: string
  label?: string
}

export function ProgressBar({ percent, className, trackClassName, barClassName, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', trackClassName, className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full bg-accent transition-[width] duration-300 ease-out', barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
