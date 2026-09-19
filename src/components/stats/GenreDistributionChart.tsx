import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/ui'
import { PieChart as PieChartIcon } from 'lucide-react'
import { ChartTooltip } from './ChartTooltip'
import type { GenreSlice } from '@/utils/stats'

export function GenreDistributionChart({ data }: { data: GenreSlice[] }) {
  if (data.length === 0) {
    return <EmptyState icon={PieChartIcon} title="Henüz tür verisi yok" description="Birkaç film ya da dizi izleyince türlerin burada görünecek." />
  }

  const top = data.slice(0, 8)
  const height = Math.max(180, top.length * 40)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 4 }} barCategoryGap={10}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
        />
        <Tooltip cursor={{ fill: 'var(--color-surface-2)' }} content={ChartTooltip} />
        <Bar dataKey="count" name="Yapım sayısı" fill="var(--color-accent)" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {top.map((entry) => (
            <Cell key={entry.id} />
          ))}
          <LabelList dataKey="percent" position="right" formatter={(v) => `%${v}`} fill="var(--color-text-subtle)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
