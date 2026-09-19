import * as RadixToast from '@radix-ui/react-toast'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { useToastStore } from '@/store/toastStore'
import { Z_INDEX } from '@/utils/constants'
import { cn } from '@/utils/cn'

const ICONS = {
  default: Info,
  success: CheckCircle2,
  danger: XCircle,
} as const

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <RadixToast.Provider swipeDirection="right" duration={5000}>
      {toasts.map((t) => {
        const Icon = ICONS[t.variant ?? 'default']
        return (
          <RadixToast.Root
            key={t.id}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id)
            }}
            className={cn(
              'flex items-start gap-3 rounded-md border border-border bg-surface p-4 shadow-2xl',
              'data-[state=open]:animate-[slide-in-right_200ms_ease-out] data-[state=closed]:animate-[fade-out_150ms_ease-in]',
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0',
                t.variant === 'success' && 'text-success',
                t.variant === 'danger' && 'text-danger',
                (!t.variant || t.variant === 'default') && 'text-accent',
              )}
              aria-hidden="true"
            />
            <div className="flex-1">
              <RadixToast.Title className="text-sm font-medium text-text">{t.title}</RadixToast.Title>
              {t.description && (
                <RadixToast.Description className="mt-0.5 text-sm text-text-muted">{t.description}</RadixToast.Description>
              )}
            </div>
            {t.action && (
              <RadixToast.Action asChild altText={t.action.label}>
                <button
                  type="button"
                  onClick={t.action.onClick}
                  className="shrink-0 rounded-full px-3 py-1 text-sm font-medium text-accent hover:bg-accent/10"
                >
                  {t.action.label}
                </button>
              </RadixToast.Action>
            )}
            <RadixToast.Close aria-label="Kapat" className="shrink-0 text-text-subtle hover:text-text">
              ×
            </RadixToast.Close>
          </RadixToast.Root>
        )
      })}
      <RadixToast.Viewport
        className="fixed bottom-4 right-4 flex w-[min(92vw,24rem)] flex-col gap-3 outline-none"
        style={{ zIndex: Z_INDEX.toast }}
      />
    </RadixToast.Provider>
  )
}
