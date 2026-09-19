import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ListVideo, Plus, Trash2 } from 'lucide-react'
import { useListsStore } from '@/store/listsStore'
import { useMediaCacheStore } from '@/store/mediaCacheStore'
import { Button, Card, ConfirmDialog, EmptyState, Input, Modal, Textarea } from '@/components/ui'
import { ROUTES } from '@/utils/routes'

export function ListsPage() {
  const lists = useListsStore((s) => s.lists)
  const mediaCache = useMediaCacheStore((s) => s.items)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) return
    await useListsStore.getState().createList(name.trim(), description.trim() || undefined)
    setName('')
    setDescription('')
    setCreateOpen(false)
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Listelerim</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Yeni Liste
        </Button>
      </div>

      {lists.length === 0 ? (
        <EmptyState
          icon={ListVideo}
          title="Henüz listen yok"
          description='"En İyi 10 Filmim" ya da "Christopher Nolan Filmleri" gibi kendi listelerini oluştur.'
          action={<Button onClick={() => setCreateOpen(true)}>Yeni Liste Oluştur</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => {
            const covers = list.itemIds.slice(0, 4).map((id) => mediaCache[id])
            return (
              <Card key={list.id} interactive className="flex flex-col gap-3 p-4">
                <Link to={ROUTES.listDetail(list.id)} className="flex flex-col gap-3">
                  <div className="grid grid-cols-4 gap-1 overflow-hidden rounded-sm">
                    {covers.length > 0 ? (
                      covers.map((c, i) => (
                        <div key={i} className="aspect-2/3 bg-surface-2">
                          {c?.posterPath && <img src={c.posterPath} alt="" className="h-full w-full object-cover" />}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-4 flex aspect-[4/1.4] items-center justify-center bg-surface-2 text-text-subtle">
                        <ListVideo className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-text">{list.name}</p>
                    <p className="text-xs text-text-subtle">{list.itemIds.length} içerik</p>
                    {list.description && <p className="mt-1 line-clamp-2 text-xs text-text-muted">{list.description}</p>}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(list.id)}
                  className="flex w-fit items-center gap-1.5 text-xs text-text-subtle hover:text-danger"
                >
                  <Trash2 className="h-3 w-3" /> Listeyi sil
                </button>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Yeni liste oluştur">
        <div className="flex flex-col gap-3">
          <Input label="Liste adı" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. En İyi 10 Filmim" />
          <Textarea label="Açıklama (opsiyonel)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <Button onClick={handleCreate} disabled={!name.trim()} className="self-end">
            Oluştur
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Liste silinsin mi?"
        description="Bu liste kalıcı olarak silinecek. İçindeki filmler/diziler kitaplığından kaldırılmaz."
        onConfirm={() => deleteTarget && useListsStore.getState().deleteList(deleteTarget)}
      />
    </div>
  )
}
