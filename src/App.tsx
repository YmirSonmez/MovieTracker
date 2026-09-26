import { lazy, Suspense, type ReactNode } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { ROUTE_PATTERNS, ROUTES } from '@/utils/routes'
import { DetailSkeleton } from '@/components/media/DetailSkeleton'
import { RailSkeleton } from '@/components/ui'
import { lazyPage } from '@/utils/lazyPage'

const HomePage = lazyPage(() => import('@/pages/HomePage').then((m) => m.HomePage))
const DiscoverPage = lazyPage(() => import('@/pages/DiscoverPage').then((m) => m.DiscoverPage))
const MoviesPage = lazyPage(() => import('@/pages/MoviesPage').then((m) => m.MoviesPage))
const TVShowsPage = lazyPage(() => import('@/pages/TVShowsPage').then((m) => m.TVShowsPage))
const LibraryPage = lazyPage(() => import('@/pages/LibraryPage').then((m) => m.LibraryPage))
const WatchlistPage = lazyPage(() => import('@/pages/WatchlistPage').then((m) => m.WatchlistPage))
// Not preloaded in the background: it carries the charts library.
const StatisticsPage = lazyPage(() => import('@/pages/StatisticsPage').then((m) => m.StatisticsPage), { preload: false })
const ListsPage = lazyPage(() => import('@/pages/ListsPage').then((m) => m.ListsPage))
const ListDetailPage = lazyPage(() => import('@/pages/ListDetailPage').then((m) => m.ListDetailPage))
const SearchPage = lazyPage(() => import('@/pages/SearchPage').then((m) => m.SearchPage))
const MovieDetailPage = lazyPage(() => import('@/pages/MovieDetailPage').then((m) => m.MovieDetailPage))
const ShowDetailPage = lazyPage(() => import('@/pages/ShowDetailPage').then((m) => m.ShowDetailPage))
const FavoritesPage = lazyPage(() => import('@/pages/FavoritesPage').then((m) => m.FavoritesPage))
const ProfilePage = lazyPage(() => import('@/pages/ProfilePage').then((m) => m.ProfilePage))
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage').then((m) => m.SettingsPage))
const DataManagementPage = lazyPage(() => import('@/pages/DataManagementPage').then((m) => m.DataManagementPage))
const CatalogListPage = lazyPage(() => import('@/pages/CatalogListPage').then((m) => m.CatalogListPage))
// Takes props (the placeholder text), so plain lazy() rather than lazyPage().
const ComingSoonPage = lazy(() => import('@/pages/ComingSoonPage').then((m) => ({ default: m.ComingSoonPage })))
const NotFoundPage = lazyPage(() => import('@/pages/NotFoundPage').then((m) => m.NotFoundPage))

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
        <Route path={ROUTES.login} element={<LoginPage />} />
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
          <Route path={ROUTE_PATTERNS.catalogList} element={withSuspense(<CatalogListPage />)} />
          <Route path="*" element={withSuspense(<NotFoundPage />)} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
