import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { ROUTE_PATTERNS, ROUTES } from '@/utils/routes'
import { HomePage } from '@/pages/HomePage'
import { DiscoverPage } from '@/pages/DiscoverPage'
import { MoviesPage } from '@/pages/MoviesPage'
import { TVShowsPage } from '@/pages/TVShowsPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { WatchlistPage } from '@/pages/WatchlistPage'
import { StatisticsPage } from '@/pages/StatisticsPage'
import { ListsPage } from '@/pages/ListsPage'
import { ListDetailPage } from '@/pages/ListDetailPage'
import { SearchPage } from '@/pages/SearchPage'
import { MovieDetailPage } from '@/pages/MovieDetailPage'
import { ShowDetailPage } from '@/pages/ShowDetailPage'
import { FavoritesPage } from '@/pages/FavoritesPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { DataManagementPage } from '@/pages/DataManagementPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.discover} element={<DiscoverPage />} />
          <Route path={ROUTES.movies} element={<MoviesPage />} />
          <Route path={ROUTES.tvShows} element={<TVShowsPage />} />
          <Route path={ROUTES.library} element={<LibraryPage />} />
          <Route path={ROUTES.watchlist} element={<WatchlistPage />} />
          <Route path="/calendar" element={<ComingSoonPage title="Takvim" description="Yaklaşan ve geçmiş bölüm yayın takvimi yakında burada." />} />
          <Route path={ROUTES.statistics} element={<StatisticsPage />} />
          <Route path={ROUTES.lists} element={<ListsPage />} />
          <Route path={ROUTE_PATTERNS.listDetail} element={<ListDetailPage />} />
          <Route path={ROUTES.search} element={<SearchPage />} />
          <Route path={ROUTE_PATTERNS.movieDetail} element={<MovieDetailPage />} />
          <Route path={ROUTE_PATTERNS.showDetail} element={<ShowDetailPage />} />
          <Route path={ROUTES.favorites} element={<FavoritesPage />} />
          <Route path={ROUTES.profile} element={<ProfilePage />} />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
          <Route path={ROUTES.dataManagement} element={<DataManagementPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
