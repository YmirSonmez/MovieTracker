export const ROUTES = {
  home: '/',
  discover: '/discover',
  movies: '/movies',
  tvShows: '/tv',
  library: '/library',
  watchlist: '/watchlist',
  statistics: '/statistics',
  lists: '/lists',
  listDetail: (id: string) => `/lists/${id}`,
  search: '/search',
  movieDetail: (id: string) => `/movie/${id}`,
  showDetail: (id: string) => `/tv/${id}`,
  favorites: '/favorites',
  profile: '/profile',
  settings: '/settings',
  dataManagement: '/settings/data',
  catalogList: (mediaType: 'movie' | 'tv', category: string) => `/discover/${mediaType}/${category}`,
} as const

export const ROUTE_PATTERNS = {
  listDetail: '/lists/:listId',
  movieDetail: '/movie/:mediaId',
  showDetail: '/tv/:mediaId',
  catalogList: '/discover/:mediaType/:category',
} as const
