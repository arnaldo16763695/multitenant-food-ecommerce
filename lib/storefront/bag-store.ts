"use client"

import * as React from "react"
import { create } from "zustand"

import type { ShoppingBagItem } from "@/lib/domain/bag"

type ShoppingBagState = {
  readonly items: readonly ShoppingBagItem[]
  readonly initializedBranches: readonly string[]
  setBranchItems: (tenantSlug: string, branchId: string, items: readonly ShoppingBagItem[]) => void
  upsertItem: (item: ShoppingBagItem) => void
  removeItem: (itemId: string, tenantSlug: string, branchId: string) => void
  clearBranchBag: (tenantSlug: string, branchId: string) => void
}

function formatMoney(value: number) {
  return `$ ${value.toFixed(2)}`
}

function buildBranchKey(tenantSlug: string, branchId: string) {
  return `${tenantSlug}:${branchId}`
}

export const useShoppingBagStore = create<ShoppingBagState>()((set) => ({
  items: [],
  initializedBranches: [],
  setBranchItems: (tenantSlug, branchId, items) => {
    const branchKey = buildBranchKey(tenantSlug, branchId)

    set((state) => ({
      items: [...state.items.filter((item) => !(item.tenantSlug === tenantSlug && item.branchId === branchId)), ...items],
      initializedBranches: state.initializedBranches.includes(branchKey) ? state.initializedBranches : [...state.initializedBranches, branchKey],
    }))
  },
  upsertItem: (item) => {
    set((state) => {
      const existingItem = state.items.find(
        (currentItem) =>
          currentItem.id === item.id && currentItem.tenantSlug === item.tenantSlug && currentItem.branchId === item.branchId
      )

      if (!existingItem) {
        return {
          items: [...state.items, item],
        }
      }

      return {
        items: state.items.map((currentItem) =>
          currentItem.id === item.id && currentItem.tenantSlug === item.tenantSlug && currentItem.branchId === item.branchId ? item : currentItem
        ),
      }
    })
  },
  removeItem: (itemId, tenantSlug, branchId) => {
    set((state) => ({
      items: state.items.filter((item) => !(item.id === itemId && item.tenantSlug === tenantSlug && item.branchId === branchId)),
    }))
  },
  clearBranchBag: (tenantSlug, branchId) => {
    set((state) => ({
      items: state.items.filter((item) => !(item.tenantSlug === tenantSlug && item.branchId === branchId)),
    }))
  },
}))

export function useHydrateShoppingBagBranch(tenantSlug: string, branchId: string, items: readonly ShoppingBagItem[]) {
  const setBranchItems = useShoppingBagStore((state) => state.setBranchItems)

  React.useEffect(() => {
    setBranchItems(tenantSlug, branchId, items)
  }, [branchId, items, setBranchItems, tenantSlug])
}

export function useShoppingBagBranchInitialized(tenantSlug: string, branchId: string) {
  const branchKey = buildBranchKey(tenantSlug, branchId)
  return useShoppingBagStore((state) => state.initializedBranches.includes(branchKey))
}

export function useShoppingBagItems(tenantSlug: string, branchId: string, fallbackItems: readonly ShoppingBagItem[] = []) {
  const items = useShoppingBagStore((state) => state.items)
  const branchInitialized = useShoppingBagBranchInitialized(tenantSlug, branchId)

  return React.useMemo(() => {
    if (!branchInitialized) {
      return fallbackItems
    }

    return items.filter((item) => item.tenantSlug === tenantSlug && item.branchId === branchId)
  }, [branchId, branchInitialized, fallbackItems, items, tenantSlug])
}

export function useShoppingBagCount(tenantSlug: string, branchId: string, fallbackCount = 0) {
  const items = useShoppingBagItems(tenantSlug, branchId)
  const branchInitialized = useShoppingBagBranchInitialized(tenantSlug, branchId)

  return React.useMemo(() => {
    if (!branchInitialized) {
      return fallbackCount
    }

    return items.reduce((count, item) => count + item.quantity, 0)
  }, [branchInitialized, fallbackCount, items])
}

export function useShoppingBagSubtotal(tenantSlug: string, branchId: string, fallbackItems: readonly ShoppingBagItem[] = []) {
  const items = useShoppingBagItems(tenantSlug, branchId, fallbackItems)
  const subtotal = React.useMemo(() => items.reduce((total, item) => total + item.quantity * item.unitPrice, 0), [items])

  return React.useMemo(
    () => ({
      value: subtotal,
      label: formatMoney(subtotal),
    }),
    [subtotal]
  )
}
