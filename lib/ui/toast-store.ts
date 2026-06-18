"use client"

import { create } from "zustand"

export type ToastVariant = "success" | "error"

export type ToastItem = {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly variant: ToastVariant
}

type ToastState = {
  readonly toasts: readonly ToastItem[]
  pushToast: (toast: Omit<ToastItem, "id">) => string
  dismissToast: (id: string) => void
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = crypto.randomUUID()

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))

    return id
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }))
  },
}))
