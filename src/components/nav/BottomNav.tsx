import { NavLink } from 'react-router-dom'
import { MOBILE_NAV } from './navItems'
import { Z_INDEX } from '@/utils/constants'
import { cn } from '@/utils/cn'

export function BottomNav() {
  return (
    <nav
      aria-label="Alt gezinme"
      className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-border bg-surface/95 py-2 backdrop-blur-sm lg:hidden"
      style={{ zIndex: Z_INDEX.mobileBottomNav, paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {MOBILE_NAV.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            cn(
              'flex min-w-[3.5rem] flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium',
              isActive ? 'text-accent' : 'text-text-subtle',
            )
          }
        >
          <item.icon className="h-5 w-5" strokeWidth={1.75} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
