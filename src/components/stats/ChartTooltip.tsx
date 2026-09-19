import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

export function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      {label !== undefined && <p className="mb-1 font-medium text-text">{label}</p>}
      {payload.map((entry, i) => (
        <p key={`${entry.dataKey}-${i}`} className="flex items-center gap-2 text-text-muted">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-mono text-text">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}
