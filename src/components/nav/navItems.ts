import { BarChart3, Bookmark, Calendar, Clapperboard, Compass, Home, ListVideo, Tv, User, Library as LibraryIcon } from 'lucide-react'
import { ROUTES } from '@/utils/routes'

export interface NavItem {
  label: string
  path: string
  icon: typeof Home
  comingSoon?: boolean
}

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Ana Sayfa', path: ROUTES.home, icon: Home },
  { label: 'Keşfet', path: ROUTES.discover, icon: Compass },
  { label: 'Filmler', path: ROUTES.movies, icon: Clapperboard },
  { label: 'Diziler', path: ROUTES.tvShows, icon: Tv },
  { label: 'Kitaplığım', path: ROUTES.library, icon: LibraryIcon },
  { label: 'İzleme Listesi', path: ROUTES.watchlist, icon: Bookmark },
  { label: 'Takvim', path: '/calendar', icon: Calendar, comingSoon: true },
  { label: 'İstatistikler', path: ROUTES.statistics, icon: BarChart3 },
  { label: 'Listelerim', path: ROUTES.lists, icon: ListVideo },
]

export const MOBILE_NAV: NavItem[] = [
  { label: 'Ana Sayfa', path: ROUTES.home, icon: Home },
  { label: 'Keşfet', path: ROUTES.discover, icon: Compass },
  { label: 'Kitaplık', path: ROUTES.library, icon: LibraryIcon },
  { label: 'İstatistik', path: ROUTES.statistics, icon: BarChart3 },
  { label: 'Profil', path: ROUTES.profile, icon: User },
]
