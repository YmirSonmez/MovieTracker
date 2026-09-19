import { useMemo, useState } from 'react'
import { BarChart3, Check, Clapperboard, Film, Pencil, Star, Timer } from 'lucide-react'
import { useProfileStore } from '@/store/profileStore'
import { useLibraryStore } from '@/store/libraryStore'
import { useRatingsStore } from '@/store/ratingsStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { computeQuickStats, formatWatchTime } from '@/utils/stats'
import { ALL_GENRES_DEDUPED } from '@/data/genres'
import { Avatar, Button, Card, Input } from '@/components/ui'
import { StatCard } from '@/components/stats/StatCard'
import { MediaRail } from '@/components/media/MediaRail'
import { cn } from '@/utils/cn'
import type { MediaSummary } from '@/types/media'

const AVATAR_OPTIONS = ['🎬', '🍿', '🎥', '📺', '🎞️', '🕶️', '👾', '🤖', '🦇', '🐉', '🧙', '🚀']

export function ProfilePage() {
  const profile = useProfileStore((s) => s.profile)
  const updateProfile = useProfileStore((s) => s.updateProfile)
  const entries = useLibraryStore((s) => s.entries)
  const watchRecords = useLibraryStore((s) => s.watchRecords)
  const episodeProgress = useLibraryStore((s) => s.episodeProgress)
  const ratings = useRatingsStore((s) => s.ratings)
  const mediaCache = useMediaCacheStore((s) => s.items)

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(profile.displayName)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)

  const stats = useMemo(
    () => computeQuickStats({ entries, watchRecords, episodeProgress, ratings }),
    [entries, watchRecords, episodeProgress, ratings],
  )

  const favoriteTitles = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.isFavorite)
        .map((e) => mediaCache[e.mediaId])
        .filter((s): s is MediaSummary => Boolean(s)),
    [entries, mediaCache],
  )

  function toggleGenre(id: number) {
    const current = profile.favoriteGenreIds
    const next = current.includes(id) ? current.filter((g) => g !== id) : [...current, id]
    updateProfile({ favoriteGenreIds: next })
  }

  return (
    <div className="flex flex-col gap-8 py-6">
      <Card className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <div className="relative">
          <Avatar name={profile.displayName} emoji={profile.avatarEmoji} size="lg" className="h-20 w-20 text-3xl" />
          <button
            type="button"
            onClick={() => setAvatarPickerOpen((v) => !v)}
            aria-label="Avatarı değiştir"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {avatarPickerOpen && (
            <div className="absolute left-1/2 top-full z-10 mt-2 flex w-56 -translate-x-1/2 flex-wrap gap-1 rounded-md border border-border bg-surface p-2 shadow-2xl">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    updateProfile({ avatarEmoji: emoji })
                    setAvatarPickerOpen(false)
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-sm text-xl hover:bg-surface-2"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} aria-label="Görünen ad" className="max-w-xs" />
              <Button
                size="sm"
                onClick={() => {
                  updateProfile({ displayName: nameDraft.trim() || profile.displayName })
                  setEditingName(false)
                }}
              >
                Kaydet
              </Button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditingName(true)} className="group flex items-center gap-2">
              <h1 className="text-xl font-bold text-text">{profile.displayName}</h1>
              <Pencil className="h-3.5 w-3.5 text-text-subtle opacity-0 group-hover:opacity-100" />
            </button>
          )}
          <p className="mt-1 text-sm text-text-subtle">
            {new Date(profile.joinedAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })} tarihinden beri üye
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Film" value={stats.moviesWatched} icon={Clapperboard} />
        <StatCard label="Dizi" value={stats.showsInProgressOrCompleted} icon={Film} />
        <StatCard label="Bölüm" value={stats.episodesWatched} icon={BarChart3} />
        <StatCard label="Süre" value={formatWatchTime(stats.totalWatchMinutes)} icon={Timer} />
        <StatCard label="Ort. puan" value={stats.averageRating ? stats.averageRating.toFixed(1) : '—'} icon={Star} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Favori Türlerin</h2>
        <p className="text-sm text-text-subtle">Anasayfadaki önerileri kişiselleştirmek için seç.</p>
        <div className="flex flex-wrap gap-2">
          {ALL_GENRES_DEDUPED.map((genre) => {
            const active = profile.favoriteGenreIds.includes(genre.id)
            return (
              <button
                key={genre.id}
                type="button"
                onClick={() => toggleGenre(genre.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-accent text-accent-foreground' : 'bg-surface-2 text-text-muted hover:text-text',
                )}
              >
                {active && <Check className="h-3.5 w-3.5" />}
                {genre.name}
              </button>
            )
          })}
        </div>
      </section>

      <MediaRail title="Favori Yapımların" items={favoriteTitles} />
    </div>
  )
}
