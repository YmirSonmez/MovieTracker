import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Z_INDEX } from '@/utils/constants'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/60 backdrop-blur-sm data-[state=open]:animate-[fade-in_150ms_ease-out] data-[state=closed]:animate-[fade-out_150ms_ease-in]"
          style={{ zIndex: Z_INDEX.modalOverlay }}
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 overscroll-contain rounded-md border border-border bg-surface p-6 shadow-2xl',
            'data-[state=open]:animate-[scale-in_150ms_ease-out] data-[state=closed]:animate-[scale-out_150ms_ease-in]',
            className,
          )}
          style={{ zIndex: Z_INDEX.modal }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-text">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-1 text-sm text-text-muted">{description}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Kapat"
                className="rounded-full p-1.5 text-text-subtle transition-colors hover:bg-surface-2 hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          {children && <div className="mt-4">{children}</div>}
          {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
