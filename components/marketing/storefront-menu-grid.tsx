"use client"

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
  readonly menu: readonly StorefrontMenuItem[]
}

export function StorefrontMenuGrid({ tenantSlug, menu }: StorefrontMenuGridProps) {
  const addItem = useShoppingBagStore((state) => state.addItem)

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {menu.map((item) => (
        <article key={item.id} className="group rounded-[1.7rem] border border-stone-200 bg-white p-5 shadow-[0_16px_50px_rgba(28,25,23,0.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(28,25,23,0.12)]">
          <div className="mb-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.35rem] border border-stone-200 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_35%),linear-gradient(180deg,_#f5f5f4_0%,_#fafaf9_100%)] p-3">
            {item.imageUrl ? <Image alt={item.name} className="h-full w-full object-contain" height={480} src={item.imageUrl} unoptimized width={640} /> : null}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-stone-950">{item.name}</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">{item.description}</p>
            </div>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">{item.basePrice}</span>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{item.category}</p>
            <Button
              size="sm"
              className="rounded-full bg-stone-950 text-white hover:bg-orange-600"
              onClick={() =>
                addItem({
                  id: item.id,
                  tenantSlug,
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
  )
}
