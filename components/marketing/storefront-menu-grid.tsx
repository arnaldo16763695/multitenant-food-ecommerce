"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingBag } from "lucide-react"

import { addCustomerBagItemAction } from "@/app/app/[tenantSlug]/bag/actions"
import type { ShoppingBagItem } from "@/lib/domain/bag"
import { Button } from "@/components/ui/button"
import { StorefrontProductSheet } from "@/components/marketing/storefront-product-sheet"
import { useHydrateShoppingBagBranch, useShoppingBagStore } from "@/lib/storefront/bag-store"

type StorefrontMenuItem = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly basePrice: string
  readonly hasVariants: boolean
  readonly variants: readonly {
    id: string
    name: string
    basePrice: string
    isDefault: boolean
  }[]
  readonly modifierGroups: readonly {
    id: string
    name: string
    selectionType: "single" | "multiple"
    minSelect: number
    maxSelect: number
    options: readonly {
      id: string
      name: string
      priceDelta: number
      priceDeltaLabel: string
    }[]
  }[]
  readonly category: string
  readonly imageUrl?: string | null
}

type StorefrontMenuGridProps = {
  readonly tenantSlug: string
  readonly branchId: string
  readonly menu: readonly StorefrontMenuItem[]
  readonly customerSession?: boolean
  readonly initialBagItems?: readonly ShoppingBagItem[]
}

export function StorefrontMenuGrid({ tenantSlug, branchId, menu, customerSession = false, initialBagItems = [] }: StorefrontMenuGridProps) {
  const upsertItem = useShoppingBagStore((state) => state.upsertItem)
  const [pendingItemId, setPendingItemId] = React.useState<string | null>(null)
  const [sheetProductId, setSheetProductId] = React.useState<string | null>(null)
  useHydrateShoppingBagBranch(tenantSlug, branchId, initialBagItems)
  const storefrontHref = branchId ? `/app/${tenantSlug}?branch=${branchId}` : `/app/${tenantSlug}`
  const loginHref = React.useMemo(
    () => `/app/${tenantSlug}/account/login?reason=bag-auth&next=${encodeURIComponent(storefrontHref)}`,
    [storefrontHref, tenantSlug]
  )
  const categories = React.useMemo(() => ["Todas", ...new Set(menu.map((item) => item.category))], [menu])
  const [activeCategory, setActiveCategory] = React.useState("Todas")
  const categoryCountMap = React.useMemo(() => {
    return menu.reduce<Map<string, number>>((map, item) => {
      map.set(item.category, (map.get(item.category) ?? 0) + 1)
      return map
    }, new Map())
  }, [menu])
  const visibleItems = React.useMemo(() => {
    if (activeCategory === "Todas") {
      return menu
    }

    return menu.filter((item) => item.category === activeCategory)
  }, [activeCategory, menu])
  const sheetProduct = React.useMemo(() => visibleItems.find((item) => item.id === sheetProductId) ?? menu.find((item) => item.id === sheetProductId) ?? null, [menu, sheetProductId, visibleItems])

  function requiresConfiguration(item: StorefrontMenuItem) {
    return item.hasVariants || item.modifierGroups.length > 0
  }

  async function handleAddItem(productId: string) {
    setPendingItemId(productId)

    const result = await addCustomerBagItemAction({
      tenantSlug,
      branchId,
      productId,
    })

    if (result.ok && result.item) {
      upsertItem(result.item)
    }

    setPendingItemId(null)
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-3 z-20 -mx-2 px-2">
        <div className="overflow-hidden rounded-[1.7rem] border border-orange-200/70 bg-white/88 shadow-[0_16px_40px_rgba(120,53,15,0.1)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/70 to-transparent" />
          <div className="flex items-center justify-between gap-3 border-b border-stone-200/70 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-700">Categorias</p>
              <p className="mt-1 text-sm text-stone-600">Filtra el menu sin perder el contexto mientras haces scroll.</p>
            </div>
            <div className="hidden rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 sm:inline-flex">
              {activeCategory === "Todas" ? `${menu.length} visibles` : `${visibleItems.length} en ${activeCategory}`}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => {
          const categoryCount = category === "Todas" ? menu.length : (categoryCountMap.get(category) ?? 0)
          const isActive = activeCategory === category

          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`group shrink-0 rounded-full border px-4 py-3 text-left transition ${
                isActive
                  ? "border-orange-500 bg-orange-500 text-white shadow-[0_14px_34px_rgba(234,88,12,0.24)]"
                  : "border-stone-200 bg-stone-50/80 text-stone-900 hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white hover:shadow-[0_16px_34px_rgba(28,25,23,0.08)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold tracking-tight ${isActive ? "text-white" : "text-stone-900"}`}>{category}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    isActive ? "bg-white/16 text-orange-50" : "bg-white text-stone-500 group-hover:text-stone-700"
                  }`}
                >
                  {categoryCount}
                </span>
              </div>
            </button>
          )
        })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleItems.map((item) => (
          <article
            key={item.id}
            className="group rounded-[1.9rem] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_rgba(28,25,23,0.06)] transition hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(28,25,23,0.12)]"
          >
            <div className="mb-5 flex aspect-[5/4] items-center justify-center overflow-hidden rounded-[1.5rem] border border-stone-200 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_38%),linear-gradient(180deg,_#f5f5f4_0%,_#fafaf9_100%)] p-4">
              {item.imageUrl ? (
                <Image
                  alt={item.name}
                  className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.04]"
                  height={560}
                  src={item.imageUrl}
                  unoptimized
                  width={720}
                />
              ) : null}
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xl font-semibold tracking-tight text-stone-950">{item.name}</p>
                <p className="mt-2 line-clamp-3 text-sm leading-7 text-stone-600">{item.description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-orange-100 px-3.5 py-1.5 text-sm font-semibold text-orange-700">{item.hasVariants ? `Desde ${item.basePrice}` : item.basePrice}</span>
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{item.category}</p>
              {customerSession ? (
                <Button
                  size="lg"
                  className="rounded-full border-orange-600 bg-orange-600 px-5 text-white hover:bg-orange-500 hover:text-white"
                  disabled={pendingItemId === item.id}
                  onClick={() => (requiresConfiguration(item) ? setSheetProductId(item.id) : void handleAddItem(item.id))}
                >
                  <ShoppingBag />
                  {requiresConfiguration(item) ? "Agregar" : pendingItemId === item.id ? "Agregando..." : "Agregar"}
                </Button>
              ) : (
                <Button asChild size="lg" className="rounded-full border-stone-950 bg-stone-950 px-5 text-white hover:bg-orange-600 hover:text-white">
                  <Link href={loginHref}>
                    <ShoppingBag />
                    Agregar
                  </Link>
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>

      {!visibleItems.length ? (
        <div className="rounded-[1.8rem] border border-dashed border-stone-300 bg-white/80 px-6 py-12 text-center shadow-[0_18px_50px_rgba(120,53,15,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Sin resultados</p>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950">No hay productos en esta categoria ahora mismo.</h3>
          <p className="mt-3 text-sm leading-7 text-stone-600">Prueba otra categoria para seguir explorando el menu.</p>
        </div>
      ) : null}

      {sheetProduct ? (
        <StorefrontProductSheet
          tenantSlug={tenantSlug}
          branchId={branchId}
          product={sheetProduct}
          open={Boolean(sheetProductId)}
          onOpenChange={(nextOpen) => setSheetProductId(nextOpen ? sheetProduct.id : null)}
          onItemAdded={upsertItem}
        />
      ) : null}
    </div>
  )
}
