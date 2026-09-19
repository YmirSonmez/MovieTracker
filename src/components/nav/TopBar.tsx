import { Search } from 'lucide-react'
import { Logo } from './Logo'
import { ProfileMenu } from './ProfileMenu'
import { Z_INDEX } from '@/utils/constants'

interface TopBarProps {
  onOpenSearch: () => void
}

export function TopBar({ onOpenSearch }: TopBarProps) {
  return (
    <header
      className="sticky top-0 flex h-16 items-center gap-4 border-b border-border bg-bg/90 px-4 backdrop-blur-sm sm:px-6"
      style={{ zIndex: Z_INDEX.stickyNav }}
    >
      <Logo />
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm text-text-subtle transition-colors hover:border-text-subtle/50 sm:max-w-sm"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Film, dizi veya kişi ara...</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] sm:block">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <ProfileMenu />
      </div>
    </header>
  )
}
