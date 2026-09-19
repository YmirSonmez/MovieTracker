import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Button, Input, Modal } from '@/components/ui'
import { useListsStore } from '@/store/listsStore'
import { toast } from '@/store/toastStore'

interface AddToListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mediaId: string
  mediaTitle: string
}

export function AddToListDialog({ open, onOpenChange, mediaId, mediaTitle }: AddToListDialogProps) {
  const lists = useListsStore((s) => s.lists)
  const [newName, setNewName] = useState('')

  async function toggle(listId: string, alreadyIn: boolean) {
    if (alreadyIn) {
      await useListsStore.getState().removeItem(listId, mediaId)
    } else {
      await useListsStore.getState().addItem(listId, mediaId)
      toast({ title: 'Listeye eklendi', variant: 'success' })
    }
  }

  async function createAndAdd() {
    const name = newName.trim()
    if (!name) return
    const list = await useListsStore.getState().createList(name)
    await useListsStore.getState().addItem(list.id, mediaId)
    setNewName('')
    toast({ title: `"${name}" listesi oluşturuldu`, description: mediaTitle, variant: 'success' })
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Listeye ekle" description={mediaTitle}>
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {lists.length === 0 && <p className="py-4 text-sm text-text-subtle">Henüz listen yok, aşağıdan bir tane oluştur.</p>}
        {lists.map((list) => {
          const alreadyIn = list.itemIds.includes(mediaId)
          return (
            <button
              key={list.id}
              type="button"
              onClick={() => toggle(list.id, alreadyIn)}
              className="flex items-center justify-between rounded-sm px-3 py-2.5 text-left text-sm text-text transition-colors hover:bg-surface-2"
            >
              <span className="truncate">{list.name}</span>
              <span className="flex items-center gap-2 text-text-subtle">
                {list.itemIds.length}
                {alreadyIn && <Check className="h-4 w-4 text-accent" />}
              </span>
            </button>
          )
        })}
      </div>
      <form
        className="mt-3 flex gap-2 border-t border-border pt-3"
        onSubmit={(e) => {
          e.preventDefault()
          createAndAdd()
        }}
      >
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Yeni liste adı" aria-label="Yeni liste adı" className="flex-1" />
        <Button type="submit" size="md" variant="outline" disabled={!newName.trim()}>
          <Plus className="h-4 w-4" /> Oluştur
        </Button>
      </form>
    </Modal>
  )
}
