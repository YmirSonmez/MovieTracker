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
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <Select
        size="sm"
        className="w-full sm:w-auto"
        ariaLabel="Film ya da dizi"
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
        className="w-full sm:w-auto"
        ariaLabel="Tür"
        value={value.genreId}
        onValueChange={(genreId) => onChange({ ...value, genreId })}
        options={[{ value: 'all', label: 'Tüm türler' }, ...genreOptions.map((g) => ({ value: String(g.id), label: g.name }))]}
      />
      <Select
        size="sm"
        className="w-full sm:w-auto"
        ariaLabel="Yıl"
        value={value.year}
        onValueChange={(year) => onChange({ ...value, year })}
        options={[{ value: 'all', label: 'Tüm yıllar' }, ...YEARS.map((y) => ({ value: y, label: y }))]}
      />
      <Select
        size="sm"
        className="w-full sm:w-auto"
        ariaLabel="En düşük puan"
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
        className="col-span-2 sm:w-auto"
        ariaLabel="Sıralama"
        value={value.sort}
        onValueChange={(sort) => onChange({ ...value, sort: sort as FilterState['sort'] })}
        options={[
          { value: 'popularity', label: 'Popülerliğe göre sırala' },
          { value: 'rating', label: 'Puana göre sırala' },
          { value: 'year', label: 'Yıla göre sırala' },
        ]}
      />
      {!isDefault && (
        <Button variant="ghost" size="sm" className="col-span-2 sm:w-auto" onClick={() => onChange(DEFAULT_FILTERS)}>
          <X className="h-3.5 w-3.5" /> Filtreleri temizle
        </Button>
      )}
    </div>
  )
}
