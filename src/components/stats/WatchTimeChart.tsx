import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import type { MonthlyActivity } from '@/utils/stats'

export function WatchTimeChart({ data }: { data: MonthlyActivity[] }) {
  const hours = data.map((d) => ({ label: d.label, saat: Math.round((d.minutes / 60) * 10) / 10 }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={hours} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap={12}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-subtle)', fontSize: 12 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-subtle)', fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'var(--color-surface-2)' }} content={ChartTooltip} />
        <Bar dataKey="saat" name="İzleme süresi (saat)" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}
