import * as RadixDropdown from '@radix-ui/react-dropdown-menu'
import { cn } from '@/utils/cn'
import { Z_INDEX } from '@/utils/constants'

export const DropdownMenu = RadixDropdown.Root
export const DropdownMenuTrigger = RadixDropdown.Trigger

export function DropdownMenuContent({ className, ...props }: RadixDropdown.DropdownMenuContentProps) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        align="end"
        sideOffset={8}
        style={{ zIndex: Z_INDEX.dropdown }}
        className={cn(
          'min-w-[12rem] rounded-md border border-border bg-surface p-1 shadow-2xl',
          'data-[state=open]:animate-[fade-in_120ms_ease-out]',
          className,
        )}
        {...props}
      />
    </RadixDropdown.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }: RadixDropdown.DropdownMenuItemProps) {
  return (
    <RadixDropdown.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm text-text outline-none transition-colors',
        'data-[highlighted]:bg-surface-2',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({ className, ...props }: RadixDropdown.DropdownMenuSeparatorProps) {
  return <RadixDropdown.Separator className={cn('my-1 h-px bg-border', className)} {...props} />
}

export function DropdownMenuLabel({ className, ...props }: RadixDropdown.DropdownMenuLabelProps) {
  return <RadixDropdown.Label className={cn('px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-text-subtle', className)} {...props} />
}
