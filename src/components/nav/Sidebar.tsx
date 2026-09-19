import { NavLink } from 'react-router-dom'
import { PRIMARY_NAV } from './navItems'
import { cn } from '@/utils/cn'

export function Sidebar() {
  return (
    <nav aria-label="Ana gezinme" className="flex w-60 shrink-0 flex-col gap-1 py-2">
      {PRIMARY_NAV.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-accent text-accent-foreground' : 'text-text-muted hover:bg-surface-2 hover:text-text',
            )
          }
        >
          <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">{item.label}</span>
          {item.comingSoon && <span className="text-[10px] font-medium text-text-subtle">yakında</span>}
        </NavLink>
      ))}
    </nav>
  )
}
