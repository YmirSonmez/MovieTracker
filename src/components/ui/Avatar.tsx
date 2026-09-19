import { cn } from '@/utils/cn'

interface AvatarProps {
  name: string
  imageUrl?: string | null
  emoji?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl' }

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function Avatar({ name, imageUrl, emoji, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-semibold text-text',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : emoji ? (
        <span aria-hidden="true">{emoji}</span>
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </div>
  )
}
