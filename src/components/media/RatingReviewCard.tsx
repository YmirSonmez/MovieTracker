import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button, Card, StarRating, Textarea } from '@/components/ui'
import { useRatingsStore } from '@/store/ratingsStore'
import { toast } from '@/store/toastStore'
import type { MediaType } from '@/types/media'

export function RatingReviewCard({ mediaId, mediaType }: { mediaId: string; mediaType: MediaType }) {
  const rating = useRatingsStore((s) => s.ratings[mediaId]?.value ?? 0)
  const review = useRatingsStore((s) => s.reviews[mediaId]?.text ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(review)

  function startEditing() {
    setDraft(review)
    setEditing(true)
  }

  async function save() {
    await useRatingsStore.getState().setReview(mediaId, mediaType, draft.trim())
    setEditing(false)
    if (draft.trim()) toast({ title: 'Notun kaydedildi', variant: 'success' })
  }

  return (
    <Card className="flex flex-col gap-5 p-4">
      <div>
        <p className="mb-2 text-sm font-medium text-text">Puanın</p>
        <StarRating
          value={rating}
          onChange={async (value) => {
            await useRatingsStore.getState().setRating(mediaId, mediaType, value)
            toast({ title: 'Puanın kaydedildi', variant: 'success' })
          }}
          label="Bu yapımı puanla"
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-text">Notun</p>
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Bu yapım hakkında ne düşünüyorsun? (opsiyonel)"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={save}>
                Kaydet
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Vazgeç
              </Button>
            </div>
          </div>
        ) : review ? (
          <div className="flex items-start justify-between gap-2">
            <p className="whitespace-pre-wrap text-sm text-text-muted">{review}</p>
            <button type="button" onClick={startEditing} aria-label="Notu düzenle" className="shrink-0 text-text-subtle hover:text-text">
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={startEditing} className="text-sm font-medium text-accent hover:underline">
            + Not ekle
          </button>
        )}
      </div>
    </Card>
  )
}
