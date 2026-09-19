import { X } from 'lucide-react'
import { Button, Select } from '@/components/ui'
import { ALL_GENRES_DEDUPED, MOVIE_GENRES, TV_GENRES } from '@/data/genres'
import { DEFAULT_FILTERS, type FilterState } from './filterTypes'

const YEARS = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - i))

interface DiscoverFiltersProps {
  value: FilterState
  onChange: (value: FilterState) => void
}

export function DiscoverFilters({ value, onChange }: DiscoverFiltersProps) {
  const genreOptions = value.type === 'tv' ? TV_GENRES : value.type === 'movie' ? MOVIE_GENRES : ALL_GENRES_DEDUPED
  const isDefault = JSON.stringify(value) === JSON.stringify(DEFAULT_FILTERS)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        size="sm"
        value={value.type}
        onValueChange={(type) => onChange({ ...value, type: type as FilterState['type'], genreId: 'all' })}
        options={[
          { value: 'all', label: 'Film + Dizi' },
          { value: 'movie', label: 'Film' },
          { value: 'tv', label: 'Dizi' },
        ]}
      />
      <Select
        size="sm"
        value={value.genreId}
        onValueChange={(genreId) => onChange({ ...value, genreId })}
        options={[{ value: 'all', label: 'Tüm türler' }, ...genreOptions.map((g) => ({ value: String(g.id), label: g.name }))]}
      />
      <Select
        size="sm"
        value={value.year}
        onValueChange={(year) => onChange({ ...value, year })}
        options={[{ value: 'all', label: 'Tüm yıllar' }, ...YEARS.map((y) => ({ value: y, label: y }))]}
      />
      <Select
        size="sm"
        value={value.minRating}
        onValueChange={(minRating) => onChange({ ...value, minRating })}
        options={[
          { value: 'all', label: 'Tüm puanlar' },
          { value: '9', label: '9+ puan' },
          { value: '8', label: '8+ puan' },
          { value: '7', label: '7+ puan' },
        ]}
      />
      <Select
        size="sm"
        value={value.sort}
        onValueChange={(sort) => onChange({ ...value, sort: sort as FilterState['sort'] })}
        options={[
          { value: 'popularity', label: 'Popülerlik' },
          { value: 'rating', label: 'Puana göre' },
          { value: 'year', label: 'Yıla göre' },
        ]}
      />
      {!isDefault && (
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_FILTERS)}>
          <X className="h-3.5 w-3.5" /> Filtreleri temizle
        </Button>
      )}
    </div>
  )
}
