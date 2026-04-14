"use client"

import * as React from "react"
import Image from "next/image"
import { ShoppingBag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { parseMoneyLabel, useShoppingBagStore } from "@/lib/storefront/bag-store"

type StorefrontMenuItem = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly basePrice: string
  readonly category: string
  readonly imageUrl?: string | null
}

type StorefrontMenuGridProps = {
  readonly tenantSlug: string
  readonly branchId: string
  readonly menu: readonly StorefrontMenuItem[]
}

export function StorefrontMenuGrid({ tenantSlug, branchId, menu }: StorefrontMenuGridProps) {
  const addItem = useShoppingBagStore((state) => state.addItem)
  const categories = React.useMemo(() => ["Todas", ...new Set(menu.map((item) => item.category))], [menu])
  const [activeCategory, setActiveCategory] = React.useState("Todas")
  const visibleItems = React.useMemo(() => {
    if (activeCategory === "Todas") {
      return menu
    }

    return menu.filter((item) => item.category === activeCategory)
  }, [activeCategory, menu])

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => {
          const categoryCount = category === "Todas" ? menu.length : menu.filter((item) => item.category === category).length
          const isActive = activeCategory === category

          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                isActive
                  ? "border-orange-500 bg-orange-500 text-white shadow-[0_16px_40px_rgba(234,88,12,0.24)]"
                  : "border-stone-200 bg-white text-stone-900 shadow-[0_12px_30px_rgba(28,25,23,0.05)] hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_18px_44px_rgba(28,25,23,0.1)]"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${isActive ? "text-orange-100" : "text-stone-500"}`}>Categoria</p>
              <p className="mt-3 text-xl font-semibold tracking-tight">{category}</p>
              <p className={`mt-2 text-sm ${isActive ? "text-orange-50/90" : "text-stone-600"}`}>{categoryCount} productos visibles</p>
            </button>
          )
        })}
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
              <span className="shrink-0 rounded-full bg-orange-100 px-3.5 py-1.5 text-sm font-semibold text-orange-700">{item.basePrice}</span>
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{item.category}</p>
              <Button
                size="lg"
                className="rounded-full border-orange-600 bg-orange-600 px-5 text-white hover:bg-orange-500 hover:text-white"
                onClick={() =>
                  addItem({
                    id: item.id,
                    tenantSlug,
                    branchId,
                    name: item.name,
                    description: item.description,
                    category: item.category,
                    unitPrice: parseMoneyLabel(item.basePrice),
                    unitPriceLabel: item.basePrice,
                  })
                }
              >
                <ShoppingBag />
                Agregar
              </Button>
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
    </div>
  )
}
