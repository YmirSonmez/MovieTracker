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
  className?: string
  size?: 'sm' | 'md'
}

export function Select({ value, onValueChange, options, placeholder, label, className, size = 'md' }: SelectProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-text">{label}</span>}
      <RadixSelect.Root value={value} onValueChange={onValueChange}>
        <RadixSelect.Trigger
          className={cn(
            'inline-flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3.5 text-sm text-text outline-none transition-colors focus:border-accent data-[placeholder]:text-text-subtle',
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
