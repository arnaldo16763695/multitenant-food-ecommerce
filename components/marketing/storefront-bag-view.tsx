"use client"

import Link from "next/link"
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react"

import { StorefrontHeader } from "@/components/marketing/storefront-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useShoppingBagItems, useShoppingBagStore, useShoppingBagSubtotal } from "@/lib/storefront/bag-store"

type StorefrontBagViewProps = {
  readonly tenantSlug: string
}

export function StorefrontBagView({ tenantSlug }: StorefrontBagViewProps) {
  const items = useShoppingBagItems(tenantSlug)
  const subtotal = useShoppingBagSubtotal(tenantSlug)
  const incrementItem = useShoppingBagStore((state) => state.incrementItem)
  const decrementItem = useShoppingBagStore((state) => state.decrementItem)
  const removeItem = useShoppingBagStore((state) => state.removeItem)
  const clearTenantBag = useShoppingBagStore((state) => state.clearTenantBag)

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_26%),linear-gradient(180deg,_#fffaf2_0%,_#fff4e6_40%,_#fffdfa_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(120,53,15,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.07)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <StorefrontHeader tenantSlug={tenantSlug} brandName="Shopping bag" branchLabel="Centro · 1.2 km" />

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[2rem] border-stone-200/80 bg-white/85 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur">
            <CardHeader>
              <CardTitle>Bolsa de compra</CardTitle>
              <CardDescription>Revisa productos, cantidades y deja tu pedido listo para pasar a checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <div className="rounded-[1.6rem] border border-dashed border-stone-300 bg-stone-50/80 px-6 py-12 text-center">
                  <ShoppingBag className="mx-auto mb-4 size-8 text-stone-400" />
                  <p className="text-lg font-semibold text-stone-950">Tu bolsa está vacía.</p>
                  <p className="mt-2 text-sm leading-7 text-stone-600">Agrega productos desde el storefront para empezar tu pedido.</p>
                  <Button asChild className="mt-5 rounded-full">
                    <Link href={`/app/${tenantSlug}`}>Volver al menú</Link>
                  </Button>
                </div>
              ) : (
                items.map((item) => (
                  <article key={item.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-stone-950">{item.name}</p>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
                            {item.category}
                          </span>
                        </div>
                        <p className="max-w-xl text-sm leading-6 text-stone-600">{item.description}</p>
                        <p className="text-sm font-semibold text-stone-950">{item.unitPriceLabel} c/u</p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-start">
                        <Button variant="outline" size="icon-sm" onClick={() => decrementItem(item.id, tenantSlug)}>
                          <Minus />
                        </Button>
                        <span className="min-w-8 text-center text-sm font-semibold text-stone-950">{item.quantity}</span>
                        <Button variant="outline" size="icon-sm" onClick={() => incrementItem(item.id, tenantSlug)}>
                          <Plus />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => removeItem(item.id, tenantSlug)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-stone-200/80 bg-white/85 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur">
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
              <CardDescription>Base del siguiente paso: checkout, direccion y metodo de pago.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-[1.5rem] bg-stone-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-500">Items</span>
                  <span className="font-semibold text-stone-950">{items.reduce((count, item) => count + item.quantity, 0)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-stone-500">Subtotal</span>
                  <span className="font-semibold text-stone-950">{subtotal.label}</span>
                </div>
              </div>

              <Button className="h-10 w-full rounded-full" disabled={items.length === 0}>
                Continuar al checkout
              </Button>
              <Button variant="outline" className="h-10 w-full rounded-full" disabled={items.length === 0} onClick={() => clearTenantBag(tenantSlug)}>
                Vaciar bolsa
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
