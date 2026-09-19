import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <Icon className="h-4 w-4 text-accent" />
      <span className="font-mono text-xl font-semibold text-text">{value}</span>
      <span className="text-xs text-text-subtle">{label}</span>
    </Card>
  )
}
