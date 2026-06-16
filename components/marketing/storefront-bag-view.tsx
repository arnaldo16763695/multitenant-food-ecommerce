"use client"

import Link from "next/link"
import * as React from "react"
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react"

import {
  addCustomerBagItemAction,
  clearCustomerBranchBagAction,
  decrementCustomerBagItemAction,
  removeCustomerBagItemAction,
} from "@/app/app/[tenantSlug]/bag/actions"
import type { CustomerAccountContext } from "@/lib/auth/customer"
import type { ShoppingBagItem } from "@/lib/domain/bag"
import { StorefrontHeader } from "@/components/marketing/storefront-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useHydrateShoppingBagBranch, useShoppingBagItems, useShoppingBagStore, useShoppingBagSubtotal } from "@/lib/storefront/bag-store"

type StorefrontBagViewProps = {
  readonly tenantSlug: string
  readonly branchId: string | null
  readonly branchLabel: string
  readonly customerSession?: Pick<CustomerAccountContext, "user" | "customer"> | null
  readonly initialBagItems?: readonly ShoppingBagItem[]
}

export function StorefrontBagView({ tenantSlug, branchId, branchLabel, customerSession, initialBagItems = [] }: StorefrontBagViewProps) {
  const activeBranchId = branchId ?? ""
  const items = useShoppingBagItems(tenantSlug, activeBranchId, initialBagItems)
  const subtotal = useShoppingBagSubtotal(tenantSlug, activeBranchId, initialBagItems)
  const upsertItem = useShoppingBagStore((state) => state.upsertItem)
  const removeItem = useShoppingBagStore((state) => state.removeItem)
  const clearBranchBag = useShoppingBagStore((state) => state.clearBranchBag)
  const [pendingItemId, setPendingItemId] = React.useState<string | null>(null)
  const [isClearing, setIsClearing] = React.useState(false)
  useHydrateShoppingBagBranch(tenantSlug, activeBranchId, initialBagItems)
  const menuHref = branchId ? `/app/${tenantSlug}?branch=${branchId}` : `/app/${tenantSlug}`
  const checkoutHref = branchId ? `/app/${tenantSlug}/checkout?branch=${branchId}` : `/app/${tenantSlug}/checkout`
  const checkoutLoginHref = `/app/${tenantSlug}/account/login?reason=checkout-auth&next=${encodeURIComponent(checkoutHref)}`
  const primaryStorefrontButtonClassName =
    "border-orange-600 bg-orange-600 text-white hover:bg-orange-500 hover:text-white disabled:border-stone-300 disabled:bg-stone-300 disabled:text-stone-500"

  async function handleIncrementItem(productId: string) {
    setPendingItemId(productId)
    const currentItem = items.find((item) => item.id === productId)
    const result = await addCustomerBagItemAction({ tenantSlug, branchId: activeBranchId, productId: currentItem?.productId ?? productId, productVariantId: currentItem?.productVariantId ?? null })

    if (result.ok && result.item) {
      upsertItem(result.item)
    }

    setPendingItemId(null)
  }

  async function handleDecrementItem(productId: string) {
    setPendingItemId(productId)
    const currentItem = items.find((item) => item.id === productId)
    const result = await decrementCustomerBagItemAction({ tenantSlug, branchId: activeBranchId, productId: currentItem?.productId ?? productId, productVariantId: currentItem?.productVariantId ?? null })

    if (result.ok) {
      if (result.quantity && result.quantity > 0) {
        const currentItem = items.find((item) => item.id === productId)

        if (currentItem) {
          upsertItem({ ...currentItem, quantity: result.quantity })
        }
      } else {
        removeItem(productId, tenantSlug, activeBranchId)
      }
    }

    setPendingItemId(null)
  }

  async function handleRemoveItem(productId: string) {
    setPendingItemId(productId)
    const currentItem = items.find((item) => item.id === productId)
    const result = await removeCustomerBagItemAction({ tenantSlug, branchId: activeBranchId, productId: currentItem?.productId ?? productId, productVariantId: currentItem?.productVariantId ?? null })

    if (result.ok) {
      removeItem(productId, tenantSlug, activeBranchId)
    }

    setPendingItemId(null)
  }

  async function handleClearBranchBag() {
    setIsClearing(true)
    const result = await clearCustomerBranchBagAction({ tenantSlug, branchId: activeBranchId })

    if (result.ok) {
      clearBranchBag(tenantSlug, activeBranchId)
    }

    setIsClearing(false)
  }

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_26%),linear-gradient(180deg,_#fffaf2_0%,_#fff4e6_40%,_#fffdfa_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(120,53,15,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.07)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <StorefrontHeader
          tenantSlug={tenantSlug}
          brandName="Bolsa de compra"
          branchId={branchId}
          branchLabel={branchLabel}
          customerSession={customerSession}
          initialBagCount={initialBagItems.reduce((count, item) => count + item.quantity, 0)}
        />

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
                  <Button asChild className={`mt-5 rounded-full ${primaryStorefrontButtonClassName}`}>
                    <Link href={menuHref}>Volver al menú</Link>
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
                        <Button variant="outline" size="icon-sm" disabled={pendingItemId === item.id} onClick={() => void handleDecrementItem(item.id)}>
                          <Minus />
                        </Button>
                        <span className="min-w-8 text-center text-sm font-semibold text-stone-950">{item.quantity}</span>
                        <Button variant="outline" size="icon-sm" disabled={pendingItemId === item.id} onClick={() => void handleIncrementItem(item.id)}>
                          <Plus />
                        </Button>
                        <Button variant="ghost" size="icon-sm" disabled={pendingItemId === item.id} onClick={() => void handleRemoveItem(item.id)}>
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
              <CardDescription>Base del siguiente paso: checkout, dirección y método de pago.</CardDescription>
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

              <Button asChild className={`h-10 w-full rounded-full ${primaryStorefrontButtonClassName}`} disabled={items.length === 0 || !branchId}>
                <Link href={customerSession ? checkoutHref : checkoutLoginHref}>{customerSession ? "Continuar al checkout" : "Inicia sesión para continuar"}</Link>
              </Button>
              <Button variant="outline" className="h-10 w-full rounded-full" disabled={items.length === 0 || !branchId || isClearing} onClick={() => void handleClearBranchBag()}>
                Vaciar bolsa
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
