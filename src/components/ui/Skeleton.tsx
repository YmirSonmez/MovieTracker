import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-[linear-gradient(110deg,var(--color-surface-2)_35%,var(--color-border)_50%,var(--color-surface-2)_65%)] bg-[length:200%_100%]',
        'animate-[shimmer_1.8s_ease-in-out_infinite]',
        className,
      )}
      {...props}
    />
  )
}

export function PosterCardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2">
      <Skeleton className="aspect-[2/3] w-full rounded-md" />
      <Skeleton className="h-3.5 w-4/5 rounded-sm" />
      <Skeleton className="h-3 w-2/5 rounded-sm" />
    </div>
  )
}

export function RailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[150px] shrink-0 sm:w-[170px]">
          <PosterCardSkeleton />
        </div>
      ))}
    </div>
  )
}
