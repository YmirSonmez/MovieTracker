import type { ReactNode } from 'react'

interface SettingsRowProps {
  title: string
  description?: string
  control: ReactNode
}

export function SettingsRow({ title, description, control }: SettingsRowProps) {
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{title}</p>
        {description && <p className="mt-0.5 text-xs text-text-subtle">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-subtle">{title}</h2>
      <div className="divide-y divide-border rounded-md border border-border bg-surface px-4">{children}</div>
    </section>
  )
}
