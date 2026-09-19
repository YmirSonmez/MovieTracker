import { lazy, Suspense, type ReactNode } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { ROUTE_PATTERNS, ROUTES } from '@/utils/routes'
import { DetailSkeleton } from '@/components/media/DetailSkeleton'
import { RailSkeleton } from '@/components/ui'

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })))
const MoviesPage = lazy(() => import('@/pages/MoviesPage').then((m) => ({ default: m.MoviesPage })))
const TVShowsPage = lazy(() => import('@/pages/TVShowsPage').then((m) => ({ default: m.TVShowsPage })))
const LibraryPage = lazy(() => import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })))
const WatchlistPage = lazy(() => import('@/pages/WatchlistPage').then((m) => ({ default: m.WatchlistPage })))
const StatisticsPage = lazy(() => import('@/pages/StatisticsPage').then((m) => ({ default: m.StatisticsPage })))
const ListsPage = lazy(() => import('@/pages/ListsPage').then((m) => ({ default: m.ListsPage })))
const ListDetailPage = lazy(() => import('@/pages/ListDetailPage').then((m) => ({ default: m.ListDetailPage })))
const SearchPage = lazy(() => import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })))
const MovieDetailPage = lazy(() => import('@/pages/MovieDetailPage').then((m) => ({ default: m.MovieDetailPage })))
const ShowDetailPage = lazy(() => import('@/pages/ShowDetailPage').then((m) => ({ default: m.ShowDetailPage })))
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const DataManagementPage = lazy(() => import('@/pages/DataManagementPage').then((m) => ({ default: m.DataManagementPage })))
const ComingSoonPage = lazy(() => import('@/pages/ComingSoonPage').then((m) => ({ default: m.ComingSoonPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

function PageFallback() {
  return (
    <div className="px-1 py-6">
      <RailSkeleton />
    </div>
  )
}

function withSuspense(element: ReactNode, fallback: ReactNode = <PageFallback />) {
  return <Suspense fallback={fallback}>{element}</Suspense>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.home} element={withSuspense(<HomePage />)} />
          <Route path={ROUTES.discover} element={withSuspense(<DiscoverPage />)} />
          <Route path={ROUTES.movies} element={withSuspense(<MoviesPage />)} />
          <Route path={ROUTES.tvShows} element={withSuspense(<TVShowsPage />)} />
          <Route path={ROUTES.library} element={withSuspense(<LibraryPage />)} />
          <Route path={ROUTES.watchlist} element={withSuspense(<WatchlistPage />)} />
          <Route
            path="/calendar"
            element={withSuspense(
              <ComingSoonPage title="Takvim" description="Yaklaşan ve geçmiş bölüm yayın takvimi yakında burada." />,
            )}
          />
          <Route path={ROUTES.statistics} element={withSuspense(<StatisticsPage />)} />
          <Route path={ROUTES.lists} element={withSuspense(<ListsPage />)} />
          <Route path={ROUTE_PATTERNS.listDetail} element={withSuspense(<ListDetailPage />)} />
          <Route path={ROUTES.search} element={withSuspense(<SearchPage />)} />
          <Route path={ROUTE_PATTERNS.movieDetail} element={withSuspense(<MovieDetailPage />, <DetailSkeleton />)} />
          <Route path={ROUTE_PATTERNS.showDetail} element={withSuspense(<ShowDetailPage />, <DetailSkeleton />)} />
          <Route path={ROUTES.favorites} element={withSuspense(<FavoritesPage />)} />
          <Route path={ROUTES.profile} element={withSuspense(<ProfilePage />)} />
          <Route path={ROUTES.settings} element={withSuspense(<SettingsPage />)} />
          <Route path={ROUTES.dataManagement} element={withSuspense(<DataManagementPage />)} />
          <Route path="*" element={withSuspense(<NotFoundPage />)} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
