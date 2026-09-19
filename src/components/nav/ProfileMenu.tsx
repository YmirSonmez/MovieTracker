import { useNavigate } from 'react-router-dom'
import { Database, Moon, Settings, Sun, User } from 'lucide-react'
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'
import { useProfileStore } from '@/store/profileStore'
import { applyTheme } from '@/utils/theme'
import { ROUTES } from '@/utils/routes'

export function ProfileMenu() {
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.profile)
  const theme = useProfileStore((s) => s.settings.theme)
  const updateSettings = useProfileStore((s) => s.updateSettings)

  const resolvedIsLight =
    theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Profil menüsü" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Avatar name={profile.displayName} emoji={profile.avatarEmoji} size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{profile.displayName}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => navigate(ROUTES.profile)}>
          <User className="h-4 w-4" /> Profil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(ROUTES.settings)}>
          <Settings className="h-4 w-4" /> Ayarlar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(ROUTES.dataManagement)}>
          <Database className="h-4 w-4" /> Veri Yönetimi
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            const next = resolvedIsLight ? 'dark' : 'light'
            updateSettings({ theme: next })
            applyTheme(next)
          }}
        >
          {resolvedIsLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {resolvedIsLight ? 'Karanlık moda geç' : 'Aydınlık moda geç'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
