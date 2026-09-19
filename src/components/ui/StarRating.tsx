import { Star } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const SIZE_MAP = { sm: 14, md: 18, lg: 24 } as const

function starFillPercent(starIndex: number, value: number): number {
  const diff = value - starIndex
  if (diff >= 1) return 100
  if (diff <= 0) return 0
  return diff * 100
}

export function StarRating({ value, onChange, readOnly = false, size = 'md', className, label }: StarRatingProps) {
  const px = SIZE_MAP[size]
  const interactive = !readOnly && Boolean(onChange)

  return (
    <div className={cn('relative inline-flex items-center gap-2', className)}>
      <div className="relative inline-flex" style={{ height: px }}>
        {Array.from({ length: 5 }).map((_, i) => {
          const percent = starFillPercent(i, value)
          return (
            <span key={i} className="relative" style={{ width: px, height: px }}>
              <Star className="absolute inset-0 text-border" strokeWidth={1.5} width={px} height={px} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${percent}%` }}>
                <Star className="text-accent" strokeWidth={1.5} width={px} height={px} fill="currentColor" />
              </span>
            </span>
          )
        })}
      </div>
      {interactive && (
        <input
          type="range"
          min={0}
          max={5}
          step={0.5}
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          aria-label={label ?? 'Puan'}
          className="absolute inset-0 w-[calc(100%-2rem)] cursor-pointer opacity-0"
        />
      )}
      <span className="font-mono text-sm text-text-muted">{value > 0 ? value.toFixed(1) : '—'}</span>
    </div>
  )
}
