import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/ui'
import { Star } from 'lucide-react'
import { ChartTooltip } from './ChartTooltip'
import type { RatingBucket } from '@/utils/stats'

export function RatingDistributionChart({ data }: { data: RatingBucket[] }) {
  const hasData = data.some((d) => d.count > 0)
  if (!hasData) {
    return <EmptyState icon={Star} title="Henüz puanlama yok" description="Puan verdiğin yapımlar arttıkça dağılım burada görünecek." />
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap={16}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-subtle)', fontSize: 12 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-subtle)', fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'var(--color-surface-2)' }} content={ChartTooltip} />
        <Bar dataKey="count" name="Puanlanan yapım" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
