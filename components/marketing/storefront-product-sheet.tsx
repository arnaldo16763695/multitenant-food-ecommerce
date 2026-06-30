"use client"

import * as React from "react"
import Image from "next/image"
import { Minus, Plus, ShoppingBag } from "lucide-react"

import { addCustomerBagItemAction } from "@/app/app/[tenantSlug]/bag/actions"
import type { ShoppingBagItem, ShoppingBagModifierSelection } from "@/lib/domain/bag"
import { formatExclusionAction, formatModifierGroupTitle, isExclusionGroup } from "@/lib/storefront/modifier-display"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useShoppingBagStore } from "@/lib/storefront/bag-store"
import { useToastStore } from "@/lib/ui/toast-store"

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
  }
  readonly open: boolean
  readonly onOpenChange: (nextOpen: boolean) => void
  readonly onItemAdded: (item: ShoppingBagItem) => void | Promise<void>
  readonly initialItem?: ShoppingBagItem | null
  readonly submitLabel?: string
}

function parsePriceLabel(value: string) {
  const numericValue = Number(value.replace(/[^0-9.-]+/g, ""))
  return Number.isFinite(numericValue) ? Number(numericValue.toFixed(2)) : 0
}

export function StorefrontProductSheet({ tenantSlug, branchId, product, open, onOpenChange, onItemAdded, initialItem = null, submitLabel = "Confirmar y agregar" }: StorefrontProductSheetProps) {
  const upsertItem = useShoppingBagStore((state) => state.upsertItem)
  const removeItem = useShoppingBagStore((state) => state.removeItem)
  const pushToast = useToastStore((state) => state.pushToast)
  const defaultVariant = React.useMemo(() => product.variants.find((variant) => variant.isDefault) ?? product.variants[0] ?? null, [product.variants])
  const [selectedVariantId, setSelectedVariantId] = React.useState(defaultVariant?.id ?? "")
  const [quantity, setQuantity] = React.useState(1)
  const [selectedOptionsByGroup, setSelectedOptionsByGroup] = React.useState<Record<string, string[]>>({})
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setSelectedVariantId(initialItem?.productVariantId ?? defaultVariant?.id ?? "")
      setQuantity(initialItem?.quantity ?? 1)
      setSelectedOptionsByGroup(
        initialItem
          ? initialItem.modifierSelections.reduce<Record<string, string[]>>((map, selection) => {
              const currentSelections = map[selection.modifierGroupId] ?? []
              return {
                ...map,
                [selection.modifierGroupId]: [...currentSelections, selection.modifierOptionId],
              }
            }, {})
          : {}
      )
      setErrorMessage("")
    }
  }, [defaultVariant?.id, initialItem, open])

  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId) ?? defaultVariant
  const modifierSelections = React.useMemo<readonly ShoppingBagModifierSelection[]>(() => {
    return product.modifierGroups.flatMap((group) => {
      const selectedOptionIds = selectedOptionsByGroup[group.id] ?? []

      return group.options
        .filter((option) => selectedOptionIds.includes(option.id))
        .map((option) => ({
          modifierGroupId: group.id,
          modifierGroupName: group.name,
          modifierOptionId: option.id,
          modifierOptionName: option.name,
          priceDelta: option.priceDelta,
          priceDeltaLabel: option.priceDeltaLabel,
        }))
    })
  }, [product.modifierGroups, selectedOptionsByGroup])
  const totalLabel = React.useMemo(
    () => `$ ${((parsePriceLabel(selectedVariant?.basePrice ?? product.basePrice) + modifierSelections.reduce((total, selection) => total + selection.priceDelta, 0)) * quantity).toFixed(2)}`,
    [modifierSelections, product.basePrice, quantity, selectedVariant?.basePrice]
  )

  function buildOptimisticItem() {
    const unitPrice = Number((parsePriceLabel(selectedVariant?.basePrice ?? product.basePrice) + modifierSelections.reduce((total, selection) => total + selection.priceDelta, 0)).toFixed(2))

    return {
      id: initialItem?.id ?? `optimistic-${crypto.randomUUID()}`,
      productId: product.id,
      productVariantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      tenantSlug,
      branchId,
      name: selectedVariant ? `${product.name} · ${selectedVariant.name}` : product.name,
      description: product.description,
      category: product.category,
      unitPrice,
      unitPriceLabel: `$ ${unitPrice.toFixed(2)}`,
      quantity,
      modifierSelections,
    } satisfies ShoppingBagItem
  }

  function handleOptionToggle(groupId: string, optionId: string, selectionType: "single" | "multiple") {
    setSelectedOptionsByGroup((currentValue) => {
      const currentSelections = currentValue[groupId] ?? []

      if (selectionType === "single") {
        return {
          ...currentValue,
          [groupId]: currentSelections.includes(optionId) ? [] : [optionId],
        }
      }

      return {
        ...currentValue,
        [groupId]: currentSelections.includes(optionId)
          ? currentSelections.filter((currentOptionId) => currentOptionId !== optionId)
          : [...currentSelections, optionId],
      }
    })
  }

  async function handleConfirm() {
    if (product.variants.length > 0 && !selectedVariant) {
      setErrorMessage("Selecciona un tamano para continuar.")
      return
    }

    for (const group of product.modifierGroups) {
      const selectedCount = (selectedOptionsByGroup[group.id] ?? []).length

      if (selectedCount < group.minSelect || selectedCount > group.maxSelect) {
        setErrorMessage(`Revisa la seleccion de ${group.name}.`)
        return
      }
    }

    const optimisticItem = buildOptimisticItem()

    if (initialItem) {
      setIsSubmitting(true)
      setErrorMessage("")
      await onItemAdded(optimisticItem)
      setIsSubmitting(false)
      return
    }

    upsertItem(optimisticItem)
    onItemAdded(optimisticItem)
    onOpenChange(false)
    if (!initialItem) {
      pushToast({
        title: "Agregado a la bolsa",
        description: `${optimisticItem.quantity} x ${optimisticItem.name}`,
        variant: "success",
      })
    }
    setIsSubmitting(true)
    setErrorMessage("")

    const result = await addCustomerBagItemAction({
      tenantSlug,
      branchId,
      productId: product.id,
      productVariantId: selectedVariant?.id ?? null,
      quantity,
      modifierSelections,
    })

    if (!result.ok || !result.item) {
      if (initialItem) {
        upsertItem(initialItem)
      } else {
        removeItem(optimisticItem.id, tenantSlug, branchId)
      }
      onOpenChange(true)
      pushToast({
        title: "No pudimos agregar el producto",
        description: result.error ?? "Intenta nuevamente.",
        variant: "error",
      })
      setErrorMessage(result.error ?? "No pudimos agregar este producto a la bolsa.")
      setIsSubmitting(false)
      return
    }

    removeItem(optimisticItem.id, tenantSlug, branchId)
    upsertItem(result.item)
    onItemAdded(result.item)
    setIsSubmitting(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-stone-200 bg-white sm:max-w-xl">
        <SheetHeader className="border-b border-stone-100 px-6 py-5">
          <SheetTitle>{product.name}</SheetTitle>
          <SheetDescription>Configura tamano, cantidad y opciones disponibles antes de confirmar la bolsa.</SheetDescription>
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

          {product.variants.length > 0 ? (
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
                      className={`flex cursor-pointer items-center justify-between rounded-[1rem] border px-4 py-3 text-left transition ${
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
          ) : null}

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

          {product.modifierGroups.length > 0 ? (
            <section className="space-y-4 rounded-[1.4rem] border border-stone-200 bg-stone-50/80 p-4">
              <div>
                <p className="text-sm font-semibold text-stone-950">Personaliza tu producto</p>
                <p className="mt-1 text-xs text-stone-500">Selecciona extras, exclusiones o complementos antes de confirmar.</p>
              </div>

              {product.modifierGroups.map((group) => (
                <div key={group.id} className="space-y-2 rounded-[1rem] border border-stone-200 bg-white p-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">{formatModifierGroupTitle(group.name)}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {isExclusionGroup(group.name)
                        ? `Marca lo que quieres quitar${group.maxSelect > 0 ? `, hasta ${group.maxSelect} opciones` : ""}.`
                        : group.selectionType === "single"
                          ? "Elige una opcion"
                          : `Elige entre ${group.minSelect} y ${group.maxSelect} opciones`}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {group.options.map((option) => {
                      const isSelected = (selectedOptionsByGroup[group.id] ?? []).includes(option.id)
                      const exclusionGroup = isExclusionGroup(group.name)

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleOptionToggle(group.id, option.id, group.selectionType)}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                            isSelected
                              ? exclusionGroup
                                ? "border-stone-400 bg-stone-100 text-stone-950"
                                : "border-orange-500 bg-orange-50 text-stone-950"
                              : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                          }`}
                        >
                          <span>{option.name}</span>
                          <span className="font-semibold">
                            {exclusionGroup
                              ? isSelected
                                ? formatExclusionAction(option.name)
                                : "Dejar"
                              : option.priceDelta > 0
                                ? `+ ${option.priceDeltaLabel}`
                                : isSelected
                                  ? "Seleccionado"
                                  : "Incluido"}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
        </div>

        <SheetFooter className="border-t border-stone-100 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">Total</p>
              <p className="mt-1 text-2xl font-semibold text-stone-950">{totalLabel}</p>
            </div>
            <Button
              className="rounded-full border-orange-600 bg-orange-600 px-6 text-white hover:bg-orange-500 hover:text-white"
              disabled={isSubmitting || (product.variants.length > 0 && !selectedVariant)}
              onClick={() => void handleConfirm()}
            >
              <ShoppingBag />
              {isSubmitting ? "Guardando..." : submitLabel}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
