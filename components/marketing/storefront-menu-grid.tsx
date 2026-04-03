"use client"

import { ShoppingBag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { parseMoneyLabel, useShoppingBagStore } from "@/lib/storefront/bag-store"

type StorefrontMenuItem = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly basePrice: string
  readonly category: string
}

type StorefrontMenuGridProps = {
  readonly tenantSlug: string
  readonly menu: readonly StorefrontMenuItem[]
}

export function StorefrontMenuGrid({ tenantSlug, menu }: StorefrontMenuGridProps) {
  const addItem = useShoppingBagStore((state) => state.addItem)

  return (
    <div className="mt-4 grid gap-3">
      {menu.map((item) => (
        <div key={item.id} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-white">{item.name}</p>
              <p className="mt-1 text-sm leading-6 text-stone-300">{item.description}</p>
            </div>
            <span className="rounded-full bg-orange-400/15 px-3 py-1 text-sm font-semibold text-orange-200">{item.basePrice}</span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{item.category}</p>
            <Button
              size="sm"
              className="rounded-full bg-white text-stone-950 hover:bg-orange-100"
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
        </div>
      ))}
    </div>
  )
}
