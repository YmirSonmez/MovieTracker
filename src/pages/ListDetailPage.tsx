import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronUp, ChevronDown, ListVideo, Pencil, Trash2, X } from 'lucide-react'
import { useListsStore } from '@/store/listsStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { Button, ConfirmDialog, EmptyState, Input, Modal, Textarea } from '@/components/ui'
import { ROUTES } from '@/utils/routes'

export function ListDetailPage() {
  const { listId = '' } = useParams()
  const navigate = useNavigate()
  const list = useListsStore((s) => s.lists.find((l) => l.id === listId))
  const mediaCache = useMediaCacheStore((s) => s.items)
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(list?.name ?? '')
  const [description, setDescription] = useState(list?.description ?? '')
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!list) {
    return <EmptyState icon={ListVideo} title="Liste bulunamadı" description="Bu liste silinmiş olabilir." />
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    if (!list) return
    const ids = [...list.itemIds]
    const swapWith = direction === 'up' ? index - 1 : index + 1
    if (swapWith < 0 || swapWith >= ids.length) return
    ;[ids[index], ids[swapWith]] = [ids[swapWith], ids[index]]
    useListsStore.getState().reorderItems(list.id, ids)
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <Link to={ROUTES.lists} className="flex w-fit items-center gap-1 text-sm text-text-subtle hover:text-text">
        <ChevronLeft className="h-4 w-4" /> Listelerim
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">{list.name}</h1>
          {list.description && <p className="mt-1 max-w-lg text-sm text-text-muted">{list.description}</p>}
          <p className="mt-1 text-xs text-text-subtle">{list.itemIds.length} içerik</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setName(list.name)
              setDescription(list.description ?? '')
              setEditOpen(true)
            }}
          >
            <Pencil className="h-3.5 w-3.5" /> Düzenle
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Sil
          </Button>
        </div>
      </div>

      {list.itemIds.length === 0 ? (
        <EmptyState icon={ListVideo} title="Liste boş" description="Bir film ya da dizi detayından 'Listeye ekle' ile buraya ekleyebilirsin." />
      ) : (
        <div className="flex flex-col gap-2">
          {list.itemIds.map((mediaId, index) => {
            const summary = mediaCache[mediaId]
            if (!summary) return null
            const detailPath = summary.mediaType === 'movie' ? ROUTES.movieDetail(summary.id) : ROUTES.showDetail(summary.id)
            return (
              <div key={mediaId} className="flex items-center gap-3 rounded-md border border-border bg-surface p-2">
                <span className="w-6 shrink-0 text-center font-mono text-sm text-text-subtle">{index + 1}</span>
                <Link to={detailPath} className="h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                  {summary.posterPath && <img src={summary.posterPath} alt="" className="h-full w-full object-cover" />}
                </Link>
                <Link to={detailPath} className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text hover:text-accent">{summary.title}</p>
                  <p className="text-xs text-text-subtle">{summary.year ?? '—'}</p>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon-sm" variant="ghost" aria-label="Yukarı taşı" disabled={index === 0} onClick={() => moveItem(index, 'up')}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Aşağı taşı"
                    disabled={index === list.itemIds.length - 1}
                    onClick={() => moveItem(index, 'down')}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Listeden kaldır" onClick={() => useListsStore.getState().removeItem(list.id, mediaId)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={editOpen} onOpenChange={setEditOpen} title="Listeyi düzenle">
        <div className="flex flex-col gap-3">
          <Input label="Liste adı" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea label="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <Button
            className="self-end"
            disabled={!name.trim()}
            onClick={async () => {
              await useListsStore.getState().renameList(list.id, name.trim())
              await useListsStore.getState().setDescription(list.id, description.trim())
              setEditOpen(false)
            }}
          >
            Kaydet
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Liste silinsin mi?"
        description="Bu liste kalıcı olarak silinecek."
        onConfirm={() => {
          useListsStore.getState().deleteList(list.id)
          navigate(ROUTES.lists)
        }}
      />
    </div>
  )
}
