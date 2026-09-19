import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-surface',
        interactive &&
          'transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-text-subtle/40 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.6)]',
        className,
      )}
      {...props}
    />
  )
}
