import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import type { MonthlyActivity } from '@/utils/stats'

export function MonthlyActivityChart({ data }: { data: MonthlyActivity[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap={12} barGap={2}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-subtle)', fontSize: 12 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-subtle)', fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'var(--color-surface-2)' }} content={ChartTooltip} />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{value}</span>}
        />
        <Bar dataKey="movies" name="Film" fill="var(--chart-series-1)" radius={[4, 4, 0, 0]} maxBarSize={16} />
        <Bar dataKey="episodes" name="Bölüm" fill="var(--chart-series-2)" radius={[4, 4, 0, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}
