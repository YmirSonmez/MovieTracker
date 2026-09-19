import { create } from 'zustand'
import { storage } from '@/services/storage/repository'
import { generateId } from '@/utils/id'
import type { CustomList } from '@/types/watch'

interface ListsState {
  hydrated: boolean
  lists: CustomList[]

  hydrate: () => Promise<void>
  createList: (name: string, description?: string) => Promise<CustomList>
  renameList: (id: string, name: string) => Promise<void>
  setDescription: (id: string, description: string) => Promise<void>
  setCover: (id: string, coverImagePath: string | null) => Promise<void>
  deleteList: (id: string) => Promise<void>
  addItem: (listId: string, mediaId: string) => Promise<void>
  removeItem: (listId: string, mediaId: string) => Promise<void>
  reorderItems: (listId: string, itemIds: string[]) => Promise<void>
}

function now(): string {
  return new Date().toISOString()
}

export const useListsStore = create<ListsState>((set, get) => ({
  hydrated: false,
  lists: [],

  async hydrate() {
    const lists = await storage.getAllLists()
    set({ lists, hydrated: true })
  },

  async createList(name, description) {
    const timestamp = now()
    const list: CustomList = {
      id: generateId(),
      name,
      description,
      itemIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await storage.putList(list)
    set((state) => ({ lists: [...state.lists, list] }))
    return list
  },

  async renameList(id, name) {
    const list = get().lists.find((l) => l.id === id)
    if (!list) return
    const updated = { ...list, name, updatedAt: now() }
    await storage.putList(updated)
    set((state) => ({ lists: state.lists.map((l) => (l.id === id ? updated : l)) }))
  },

  async setDescription(id, description) {
    const list = get().lists.find((l) => l.id === id)
    if (!list) return
    const updated = { ...list, description, updatedAt: now() }
    await storage.putList(updated)
    set((state) => ({ lists: state.lists.map((l) => (l.id === id ? updated : l)) }))
  },

  async setCover(id, coverImagePath) {
    const list = get().lists.find((l) => l.id === id)
    if (!list) return
    const updated = { ...list, coverImagePath, updatedAt: now() }
    await storage.putList(updated)
    set((state) => ({ lists: state.lists.map((l) => (l.id === id ? updated : l)) }))
  },

  async deleteList(id) {
    await storage.deleteList(id)
    set((state) => ({ lists: state.lists.filter((l) => l.id !== id) }))
  },

  async addItem(listId, mediaId) {
    const list = get().lists.find((l) => l.id === listId)
    if (!list || list.itemIds.includes(mediaId)) return
    const updated = { ...list, itemIds: [...list.itemIds, mediaId], updatedAt: now() }
    await storage.putList(updated)
    set((state) => ({ lists: state.lists.map((l) => (l.id === listId ? updated : l)) }))
  },

  async removeItem(listId, mediaId) {
    const list = get().lists.find((l) => l.id === listId)
    if (!list) return
    const updated = { ...list, itemIds: list.itemIds.filter((id) => id !== mediaId), updatedAt: now() }
    await storage.putList(updated)
    set((state) => ({ lists: state.lists.map((l) => (l.id === listId ? updated : l)) }))
  },

  async reorderItems(listId, itemIds) {
    const list = get().lists.find((l) => l.id === listId)
    if (!list) return
    const updated = { ...list, itemIds, updatedAt: now() }
    await storage.putList(updated)
    set((state) => ({ lists: state.lists.map((l) => (l.id === listId ? updated : l)) }))
  },
}))
