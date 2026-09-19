import * as RadixTabs from '@radix-ui/react-tabs'
import { cn } from '@/utils/cn'

export const Tabs = RadixTabs.Root

export function TabsList({ className, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={cn('inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1', className)}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: RadixTabs.TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium text-text-muted transition-colors',
        'data-[state=active]:bg-accent data-[state=active]:text-accent-foreground',
        'hover:text-text data-[state=active]:hover:text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = RadixTabs.Content
