import { useId } from 'react'
import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Z_INDEX } from '@/utils/constants'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  /** An accessible name for when a visible label would be redundant or take
   * up space the layout can't spare (e.g. a compact filter bar) - the
   * currently-selected option text alone often doesn't tell a screen reader
   * user what the control filters by. Ignored if `label` is also set. */
  ariaLabel?: string
  className?: string
  size?: 'sm' | 'md'
}

export function Select({ value, onValueChange, options, placeholder, label, ariaLabel, className, size = 'md' }: SelectProps) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span id={labelId} className="text-sm font-medium text-text">
          {label}
        </span>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange}>
        <RadixSelect.Trigger
          aria-labelledby={label ? labelId : undefined}
          aria-label={!label ? ariaLabel : undefined}
          className={cn(
            'inline-flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3.5 text-sm text-text outline-none transition-colors focus-visible:border-accent data-[placeholder]:text-text-subtle',
            size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10',
            className,
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="h-4 w-4 text-text-subtle" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            className="overflow-hidden rounded-md border border-border bg-surface shadow-xl"
            style={{ zIndex: Z_INDEX.dropdown }}
            position="popper"
            sideOffset={6}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 pl-8 text-sm text-text outline-none data-[highlighted]:bg-surface-2"
                >
                  <RadixSelect.ItemIndicator className="absolute left-2 inline-flex items-center">
                    <Check className="h-3.5 w-3.5 text-accent" />
                  </RadixSelect.ItemIndicator>
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  )
}
