import { useState } from 'react'
import { NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useProfileStore } from '@/store/profileStore'
import { Button, Card, ConfirmDialog, EmptyState, Textarea } from '@/components/ui'
import { generateId } from '@/utils/id'
import type { ProfileNote } from '@/types/user'

function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function ProfileNotes() {
  const storedNotes = useProfileStore((s) => s.profile.notes)
  const updateProfile = useProfileStore((s) => s.updateProfile)

  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [pendingDelete, setPendingDelete] = useState<ProfileNote | null>(null)

  const notes = storedNotes ?? []
  const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  function addNote() {
    const text = draft.trim()
    if (!text) return
    const now = new Date().toISOString()
    updateProfile({ notes: [{ id: generateId(), text, createdAt: now, updatedAt: now }, ...notes] })
    setDraft('')
  }

  function saveEdit(id: string) {
    const text = editDraft.trim()
    if (!text) return
    const now = new Date().toISOString()
    updateProfile({ notes: notes.map((n) => (n.id === id ? { ...n, text, updatedAt: now } : n)) })
    setEditingId(null)
  }

  function deleteNote(id: string) {
    updateProfile({ notes: notes.filter((n) => n.id !== id) })
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-text">Notlarım</h2>
      <p className="text-sm text-text-subtle">İzlemek istediklerin, önerilen yapımlar ya da aklına gelen her şey.</p>

      <Card className="flex flex-col gap-3 p-4">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              addNote()
            }
          }}
          rows={3}
          placeholder="Yeni bir not yaz…"
          aria-label="Yeni not"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={addNote} disabled={!draft.trim()}>
            <Plus className="h-4 w-4" />
            Not ekle
          </Button>
        </div>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState icon={NotebookPen} title="Henüz not yok" description="İlk notunu yukarıdan ekleyebilirsin." className="py-10" />
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((note) => (
            <li key={note.id}>
              <Card className="flex flex-col gap-2 p-4">
                {editingId === note.id ? (
                  <>
                    <Textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault()
                          saveEdit(note.id)
                        } else if (e.key === 'Escape') {
                          setEditingId(null)
                        }
                      }}
                      rows={3}
                      aria-label="Notu düzenle"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Vazgeç
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(note.id)} disabled={!editDraft.trim()}>
                        Kaydet
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap break-words text-sm text-text">{note.text}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-text-subtle">
                        {formatNoteDate(note.updatedAt)}
                        {note.updatedAt !== note.createdAt && ' · düzenlendi'}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Notu düzenle"
                          onClick={() => {
                            setEditingId(note.id)
                            setEditDraft(note.text)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" aria-label="Notu sil" onClick={() => setPendingDelete(note)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Not silinsin mi?"
        description="Bu not kalıcı olarak silinecek."
        confirmLabel="Sil"
        onConfirm={() => {
          if (pendingDelete) deleteNote(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </section>
  )
}
