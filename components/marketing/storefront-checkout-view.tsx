"use client"

import * as React from "react"
import Link from "next/link"
import { LoaderCircle, ShoppingBag } from "lucide-react"

import { createStorefrontOrderAction } from "@/app/app/[tenantSlug]/checkout/actions"
import type { CustomerAccountContext } from "@/lib/auth/customer"
import type { CheckoutBagItemInput } from "@/lib/domain/order"
import { useShoppingBagItems, useShoppingBagStore, useShoppingBagSubtotal } from "@/lib/storefront/bag-store"

import { StorefrontHeader } from "@/components/marketing/storefront-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type StorefrontCheckoutViewProps = {
  readonly tenantSlug: string
  readonly branchId: string | null
  readonly branchLabel: string
  readonly customerDefaults?: {
    fullName?: string | null
    email?: string | null
    phone?: string | null
  }
  readonly customerSession?: Pick<CustomerAccountContext, "user" | "customer"> | null
}

export function StorefrontCheckoutView({ tenantSlug, branchId, branchLabel, customerDefaults, customerSession }: StorefrontCheckoutViewProps) {
  const activeBranchId = branchId ?? ""
  const items = useShoppingBagItems(tenantSlug, activeBranchId)
  const subtotal = useShoppingBagSubtotal(tenantSlug, activeBranchId)
  const clearBranchBag = useShoppingBagStore((state) => state.clearBranchBag)
  const [fullName, setFullName] = React.useState(customerDefaults?.fullName ?? "")
  const [email, setEmail] = React.useState(customerDefaults?.email ?? "")
  const [phone, setPhone] = React.useState(customerDefaults?.phone ?? "")
  const [notes, setNotes] = React.useState("")
  const [fulfillmentType, setFulfillmentType] = React.useState<"pickup" | "delivery">("pickup")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const menuHref = branchId ? `/app/${tenantSlug}?branch=${branchId}` : `/app/${tenantSlug}`
  const primaryStorefrontButtonClassName =
    "border-orange-600 bg-orange-600 text-white hover:bg-orange-500 hover:text-white disabled:border-stone-300 disabled:bg-stone-300 disabled:text-stone-500"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")

    if (!branchId) {
      setErrorMessage("Selecciona una sucursal activa antes de continuar.")
      return
    }

    if (!items.length) {
      setErrorMessage("Tu bolsa esta vacia.")
      return
    }

    try {
      setIsSubmitting(true)

      const result = await createStorefrontOrderAction({
        tenantSlug,
        branchId,
        items: items as readonly CheckoutBagItemInput[],
        fullName,
        email,
        phone,
        notes,
        fulfillmentType,
      })

      if (!result.ok || !result.orderId) {
        setErrorMessage(result.error ?? "No pudimos registrar tu pedido.")
        setIsSubmitting(false)
        return
      }

      clearBranchBag(tenantSlug, activeBranchId)
      window.location.assign(`/app/${tenantSlug}/orders/${result.orderId}`)
    } catch {
      setErrorMessage("No pudimos completar el checkout. Intenta nuevamente.")
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_26%),linear-gradient(180deg,_#fffaf2_0%,_#fff4e6_40%,_#fffdfa_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(120,53,15,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.07)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <StorefrontHeader tenantSlug={tenantSlug} brandName="Checkout" branchId={branchId} branchLabel={branchLabel} customerSession={customerSession} />

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[2rem] border-stone-200/80 bg-white/85 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur">
            <CardHeader>
              <CardTitle>Datos para confirmar tu pedido</CardTitle>
              <CardDescription>Usamos esta informacion para ubicar tu pedido y comunicarnos contigo si hace falta.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-card-foreground">Nombre completo</span>
                    <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ej. Ana Torres" required />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-card-foreground">Telefono</span>
                    <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+5215512345678" required />
                  </label>
                </div>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-card-foreground">Email</span>
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@correo.com" />
                </label>

                <div className="grid gap-2 text-sm">
                  <span className="font-medium text-card-foreground">Tipo de entrega</span>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={fulfillmentType === "pickup" ? "default" : "outline"} className="rounded-full" onClick={() => setFulfillmentType("pickup")}>
                      Pickup
                    </Button>
                    <Button type="button" variant={fulfillmentType === "delivery" ? "default" : "outline"} className="rounded-full" onClick={() => setFulfillmentType("delivery")}>
                      Delivery
                    </Button>
                  </div>
                </div>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-card-foreground">Notas</span>
                  <textarea
                    className="min-h-28 rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    placeholder="Ej. sin cebolla, entregar en puerta, etc."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>

                {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}

                <Button className={`h-10 rounded-full ${primaryStorefrontButtonClassName}`} disabled={isSubmitting || items.length === 0 || !branchId} type="submit">
                  {isSubmitting ? <LoaderCircle className="animate-spin" /> : <ShoppingBag />}
                  {isSubmitting ? "Procesando pedido..." : "Enviar pedido"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-stone-200/80 bg-white/85 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur">
            <CardHeader>
              <CardTitle>Resumen del pedido</CardTitle>
              <CardDescription>Lo que estas por confirmar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {items.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-stone-300 px-6 py-10 text-center text-stone-600">
                  Tu bolsa esta vacia.{" "}
                  <Link className="font-semibold text-stone-950" href={menuHref}>
                    Volver al menu
                  </Link>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rounded-[1.25rem] bg-stone-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-stone-950">{item.name}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {item.quantity} x {item.unitPriceLabel}
                        </p>
                      </div>
                      <span className="font-semibold text-stone-950">$ {(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}

              <div className="rounded-[1.5rem] bg-stone-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-500">Subtotal</span>
                  <span className="font-semibold text-stone-950">{subtotal.label}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
