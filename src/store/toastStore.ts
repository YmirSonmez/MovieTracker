import { create } from 'zustand'
import { generateId } from '@/utils/id'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'danger'
  action?: ToastAction
}

interface ToastState {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => string
  show: (toast: ToastItem) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push(toast) {
    const id = generateId()
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    return id
  },
  show(toast) {
    set((state) => ({ toasts: [...state.toasts, toast] }))
  },
  dismiss(id) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))

/** Convenience for firing a toast from anywhere, including outside React
 * components (store actions, services) - not just from within a hook.
 *
 * The toast appears one frame after the call, once whatever the user just
 * tapped has repainted: mounting a toast forces a full style recalculation
 * (its enter animation is measured), and doing that inside the tap's own
 * frame is what made taps feel sluggish. */
export function toast(item: Omit<ToastItem, 'id'>): string {
  const id = generateId()
  requestAnimationFrame(() => setTimeout(() => useToastStore.getState().show({ ...item, id }), 0))
  return id
}
