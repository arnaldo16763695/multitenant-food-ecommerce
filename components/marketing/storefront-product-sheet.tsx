"use client"

import * as React from "react"
import Image from "next/image"
import { Minus, Plus, ShoppingBag } from "lucide-react"

import { addCustomerBagItemAction } from "@/app/app/[tenantSlug]/bag/actions"
import type { ShoppingBagItem } from "@/lib/domain/bag"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

type ProductVariantOption = {
  readonly id: string
  readonly name: string
  readonly basePrice: string
  readonly isDefault: boolean
}

type StorefrontProductSheetProps = {
  readonly tenantSlug: string
  readonly branchId: string
  readonly product: {
    readonly id: string
    readonly name: string
    readonly description: string
    readonly category: string
    readonly imageUrl?: string | null
    readonly basePrice: string
    readonly variants: readonly ProductVariantOption[]
  }
  readonly open: boolean
  readonly onOpenChange: (nextOpen: boolean) => void
  readonly onItemAdded: (item: ShoppingBagItem) => void
}

function parsePriceLabel(value: string) {
  const numericValue = Number(value.replace(/[^0-9.-]+/g, ""))
  return Number.isFinite(numericValue) ? Number(numericValue.toFixed(2)) : 0
}

export function StorefrontProductSheet({ tenantSlug, branchId, product, open, onOpenChange, onItemAdded }: StorefrontProductSheetProps) {
  const defaultVariant = React.useMemo(() => product.variants.find((variant) => variant.isDefault) ?? product.variants[0] ?? null, [product.variants])
  const [selectedVariantId, setSelectedVariantId] = React.useState(defaultVariant?.id ?? "")
  const [quantity, setQuantity] = React.useState(1)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setSelectedVariantId(defaultVariant?.id ?? "")
      setQuantity(1)
      setErrorMessage("")
    }
  }, [defaultVariant?.id, open])

  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId) ?? defaultVariant
  const totalLabel = React.useMemo(() => `$ ${(parsePriceLabel(selectedVariant?.basePrice ?? product.basePrice) * quantity).toFixed(2)}`, [product.basePrice, quantity, selectedVariant?.basePrice])

  async function handleConfirm() {
    if (!selectedVariant) {
      setErrorMessage("Selecciona un tamano para continuar.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage("")

    const result = await addCustomerBagItemAction({
      tenantSlug,
      branchId,
      productId: product.id,
      productVariantId: selectedVariant.id,
      quantity,
    })

    if (!result.ok || !result.item) {
      setErrorMessage(result.error ?? "No pudimos agregar este producto a la bolsa.")
      setIsSubmitting(false)
      return
    }

    onItemAdded(result.item)
    setIsSubmitting(false)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-stone-200 bg-white sm:max-w-xl">
        <SheetHeader className="border-b border-stone-100 px-6 py-5">
          <SheetTitle>{product.name}</SheetTitle>
          <SheetDescription>Elige el tamano antes de confirmar tu bolsa. Luego ampliaremos este flujo para extras, exclusiones y notas.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
              {product.imageUrl ? <Image alt={product.name} className="h-full w-full object-contain" height={520} src={product.imageUrl} unoptimized width={520} /> : null}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{product.category}</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">{product.description}</p>
            </div>
          </div>

          <section className="space-y-3 rounded-[1.4rem] border border-stone-200 bg-stone-50/80 p-4">
            <div>
              <p className="text-sm font-semibold text-stone-950">Tamano</p>
              <p className="mt-1 text-xs text-stone-500">Seleccion obligatoria para calcular el precio final.</p>
            </div>
            <div className="grid gap-2">
              {product.variants.map((variant) => {
                const isSelected = variant.id === selectedVariantId

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`flex items-center justify-between rounded-[1rem] border px-4 py-3 text-left transition ${
                      isSelected ? "border-orange-500 bg-orange-50 text-stone-950" : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    <span className="font-medium">{variant.name}</span>
                    <span className="text-sm font-semibold">{variant.basePrice}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3 rounded-[1.4rem] border border-stone-200 bg-stone-50/80 p-4">
            <div>
              <p className="text-sm font-semibold text-stone-950">Cantidad</p>
              <p className="mt-1 text-xs text-stone-500">Ajusta cuantas unidades quieres confirmar ahora.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setQuantity((current) => Math.max(current - 1, 1))}>
                <Minus />
              </Button>
              <span className="min-w-10 text-center text-lg font-semibold text-stone-950">{quantity}</span>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setQuantity((current) => current + 1)}>
                <Plus />
              </Button>
            </div>
          </section>

          {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
        </div>

        <SheetFooter className="border-t border-stone-100 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">Total</p>
              <p className="mt-1 text-2xl font-semibold text-stone-950">{totalLabel}</p>
            </div>
            <Button className="rounded-full border-orange-600 bg-orange-600 px-6 text-white hover:bg-orange-500 hover:text-white" disabled={isSubmitting || !selectedVariant} onClick={() => void handleConfirm()}>
              <ShoppingBag />
              {isSubmitting ? "Agregando..." : "Confirmar y agregar"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
