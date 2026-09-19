import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { BarChart3, Bookmark, Compass, Library, Search } from 'lucide-react'
import { Z_INDEX } from '@/utils/constants'
import { ROUTES } from '@/utils/routes'

const QUICK_LINKS = [
  { label: 'Keşfet', path: ROUTES.discover, icon: Compass },
  { label: 'Kitaplığım', path: ROUTES.library, icon: Library },
  { label: 'İzleme Listesi', path: ROUTES.watchlist, icon: Bookmark },
  { label: 'İstatistikler', path: ROUTES.statistics, icon: BarChart3 },
]

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setQuery('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  function goToSearch() {
    onOpenChange(false)
    navigate(query.trim() ? `${ROUTES.search}?q=${encodeURIComponent(query.trim())}` : ROUTES.search)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" style={{ zIndex: Z_INDEX.modalOverlay }} />
        <Dialog.Content
          className="fixed left-1/2 top-[12vh] w-[min(92vw,34rem)] -translate-x-1/2 overflow-hidden rounded-md border border-border bg-surface shadow-2xl"
          style={{ zIndex: Z_INDEX.commandPalette }}
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Hızlı arama ve gezinme</Dialog.Title>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              goToSearch()
            }}
            className="flex items-center gap-3 border-b border-border px-4"
          >
            <Search className="h-4 w-4 shrink-0 text-text-subtle" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Film, dizi ara..."
              className="h-14 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-subtle"
            />
            <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-text-subtle sm:block">esc</kbd>
          </form>
          <div className="p-2">
            <p className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-text-subtle">Hızlı erişim</p>
            {QUICK_LINKS.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  navigate(link.path)
                }}
                className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm text-text transition-colors hover:bg-surface-2"
              >
                <link.icon className="h-4 w-4 text-text-subtle" />
                {link.label}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
