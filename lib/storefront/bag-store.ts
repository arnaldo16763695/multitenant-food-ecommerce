"use client"

import * as React from "react"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type ShoppingBagItem = {
  readonly id: string
  readonly tenantSlug: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly unitPrice: number
  readonly unitPriceLabel: string
  readonly quantity: number
}

type ShoppingBagState = {
  readonly items: readonly ShoppingBagItem[]
  addItem: (item: Omit<ShoppingBagItem, "quantity">) => void
  incrementItem: (itemId: string, tenantSlug: string) => void
  decrementItem: (itemId: string, tenantSlug: string) => void
  removeItem: (itemId: string, tenantSlug: string) => void
  clearTenantBag: (tenantSlug: string) => void
}

const SHOPPING_BAG_STORAGE_KEY = "vz-food-shopping-bag-v1"

function isBrowser() {
  return typeof window !== "undefined"
}

function formatMoney(value: number) {
  return `$ ${value.toFixed(2)}`
}

export function parseMoneyLabel(value: string) {
  const numericValue = Number(value.replace(/[^0-9.-]+/g, ""))

  return Number.isFinite(numericValue) ? Number(numericValue.toFixed(2)) : 0
}

export const useShoppingBagStore = create<ShoppingBagState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((currentItem) => currentItem.id === item.id && currentItem.tenantSlug === item.tenantSlug)

          if (!existingItem) {
            return {
              items: [...state.items, { ...item, quantity: 1 }],
            }
          }

          return {
            items: state.items.map((currentItem) =>
              currentItem.id === item.id && currentItem.tenantSlug === item.tenantSlug
                ? { ...currentItem, quantity: currentItem.quantity + 1 }
                : currentItem
            ),
          }
        })
      },
      incrementItem: (itemId, tenantSlug) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId && item.tenantSlug === tenantSlug ? { ...item, quantity: item.quantity + 1 } : item
          ),
        }))
      },
      decrementItem: (itemId, tenantSlug) => {
        set((state) => ({
          items: state.items
            .map((item) =>
              item.id === itemId && item.tenantSlug === tenantSlug ? { ...item, quantity: item.quantity - 1 } : item
            )
            .filter((item) => item.quantity > 0),
        }))
      },
      removeItem: (itemId, tenantSlug) => {
        set((state) => ({
          items: state.items.filter((item) => !(item.id === itemId && item.tenantSlug === tenantSlug)),
        }))
      },
      clearTenantBag: (tenantSlug) => {
        set((state) => ({
          items: state.items.filter((item) => item.tenantSlug !== tenantSlug),
        }))
      },
    }),
    {
      name: SHOPPING_BAG_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      skipHydration: !isBrowser(),
      version: 1,
    }
  )
)

export function useShoppingBagItems(tenantSlug: string) {
  const items = useShoppingBagStore((state) => state.items)

  return React.useMemo(() => items.filter((item) => item.tenantSlug === tenantSlug), [items, tenantSlug])
}

export function useShoppingBagCount(tenantSlug: string) {
  const items = useShoppingBagItems(tenantSlug)

  return React.useMemo(() => items.reduce((count, item) => count + item.quantity, 0), [items])
}

export function useShoppingBagSubtotal(tenantSlug: string) {
  const items = useShoppingBagItems(tenantSlug)
  const subtotal = React.useMemo(() => items.reduce((total, item) => total + item.quantity * item.unitPrice, 0), [items])

  return React.useMemo(
    () => ({
      value: subtotal,
      label: formatMoney(subtotal),
    }),
    [subtotal]
  )
}
