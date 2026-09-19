"use client"

import * as React from "react"
import Image from "next/image"
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react"

import { addCustomerBagItemConfigurationsAction } from "@/app/app/[tenantSlug]/bag/actions"
import type { ShoppingBagConfiguration, ShoppingBagItem, ShoppingBagModifierSelection } from "@/lib/domain/bag"
import { flyProductToBag } from "@/lib/storefront/fly-to-bag"
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
      modifierKind: "ingredient" | "addon" | "choice"
      minSelect: number
      maxSelect: number
      options: readonly {
        id: string
        name: string
        priceDelta: number
        priceDeltaLabel: string
      }[]
    }[]
    readonly comboComponents: readonly {
      componentProductName: string
      componentVariantName: string | null
      quantity: number
    }[]
  }
  readonly open: boolean
  readonly onOpenChange: (nextOpen: boolean) => void
  readonly onItemAdded: (item: ShoppingBagItem) => void | Promise<void>
  readonly onConfigurationsReplaced?: (input: {
    readonly originalItemId: string
    readonly productId: string
    readonly productVariantId: string | null
    readonly configurations: readonly ShoppingBagConfiguration[]
  }) => void | Promise<void>
  readonly initialItem?: ShoppingBagItem | null
  readonly submitLabel?: string
  readonly branchOperationalStatus?: {
    readonly acceptingOrders: boolean
    readonly closureLabel: string | null
    readonly nextTransitionLabel: string | null
  } | null
}

function parsePriceLabel(value: string) {
  const numericValue = Number(value.replace(/[^0-9.-]+/g, ""))
  return Number.isFinite(numericValue) ? Number(numericValue.toFixed(2)) : 0
}

type PendingConfiguration = {
  readonly id: string
  readonly quantity: number
  readonly modifierSelections: readonly ShoppingBagModifierSelection[]
}

export function StorefrontProductSheet({ tenantSlug, branchId, product, open, onOpenChange, onItemAdded, onConfigurationsReplaced, initialItem = null, submitLabel = "Confirmar y agregar", branchOperationalStatus = null }: StorefrontProductSheetProps) {
  const upsertItem = useShoppingBagStore((state) => state.upsertItem)
  const removeItem = useShoppingBagStore((state) => state.removeItem)
  const pushToast = useToastStore((state) => state.pushToast)
  const defaultVariant = React.useMemo(() => product.variants.find((variant) => variant.isDefault) ?? product.variants[0] ?? null, [product.variants])
  const [selectedVariantId, setSelectedVariantId] = React.useState(defaultVariant?.id ?? "")
  const [quantity, setQuantity] = React.useState(1)
  const [selectedOptionsByGroup, setSelectedOptionsByGroup] = React.useState<Record<string, string[]>>({})
  // Configurations the customer already locked in via "Agregar otra combinacion" this session --
  // each becomes its own bag line. quantity/selectedOptionsByGroup above are always the "current
  // draft" being edited; see handleAddAnotherConfiguration and the multi-config UI below.
  const [pendingConfigurations, setPendingConfigurations] = React.useState<readonly PendingConfiguration[]>([])
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const imageContainerRef = React.useRef<HTMLDivElement>(null)

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
      setPendingConfigurations([])
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
          modifierKind: group.modifierKind,
          modifierOptionId: option.id,
          modifierOptionName: option.name,
          priceDelta: option.priceDelta,
          priceDeltaLabel: option.priceDeltaLabel,
        }))
    })
  }, [product.modifierGroups, selectedOptionsByGroup])

  // Once the customer has locked in a configuration, the current draft is allowed to sit at 0
  // units -- it only contributes to the confirm if they actually bump it back up. Outside that
  // mode the draft always requires at least 1, matching the pre-multi-config behavior exactly.
  const isMultiConfigMode = pendingConfigurations.length > 0
  const minQuantity = isMultiConfigMode ? 0 : 1

  React.useEffect(() => {
    if (!isMultiConfigMode && quantity < 1) {
      setQuantity(1)
    }
  }, [isMultiConfigMode, quantity])

  const configurations = React.useMemo<readonly ShoppingBagConfiguration[]>(
    () => [
      ...pendingConfigurations.map((configuration) => ({ quantity: configuration.quantity, modifierSelections: configuration.modifierSelections })),
      ...(quantity > 0 ? [{ quantity, modifierSelections }] : []),
    ],
    [modifierSelections, pendingConfigurations, quantity]
  )
  const totalUnits = React.useMemo(() => configurations.reduce((total, configuration) => total + configuration.quantity, 0), [configurations])
  const totalLabel = React.useMemo(() => {
    const baseUnitPrice = parsePriceLabel(selectedVariant?.basePrice ?? product.basePrice)
    const total = configurations.reduce((sum, configuration) => sum + (baseUnitPrice + configuration.modifierSelections.reduce((delta, selection) => delta + selection.priceDelta, 0)) * configuration.quantity, 0)
    return `$ ${total.toFixed(2)}`
  }, [configurations, product.basePrice, selectedVariant?.basePrice])

  function buildOptimisticItem(overrides: { id: string; quantity: number; modifierSelections: readonly ShoppingBagModifierSelection[] }) {
    const unitPrice = Number((parsePriceLabel(selectedVariant?.basePrice ?? product.basePrice) + overrides.modifierSelections.reduce((total, selection) => total + selection.priceDelta, 0)).toFixed(2))

    return {
      id: overrides.id,
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
      quantity: overrides.quantity,
      modifierSelections: overrides.modifierSelections,
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

  function validateDraftModifierSelections() {
    for (const group of product.modifierGroups) {
      const selectedCount = (selectedOptionsByGroup[group.id] ?? []).length

      if (selectedCount < group.minSelect || selectedCount > group.maxSelect) {
        setErrorMessage(`Revisa la seleccion de ${group.name}.`)
        return false
      }
    }

    return true
  }

  function handleAddAnotherConfiguration() {
    if (quantity < 1 || !validateDraftModifierSelections()) {
      return
    }

    setPendingConfigurations((current) => [...current, { id: crypto.randomUUID(), quantity, modifierSelections }])
    setSelectedOptionsByGroup({})
    setQuantity(0)
    setErrorMessage("")
  }

  function handleRemovePendingConfiguration(id: string) {
    setPendingConfigurations((current) => current.filter((configuration) => configuration.id !== id))
  }

  async function handleConfirm() {
    if (branchOperationalStatus && !branchOperationalStatus.acceptingOrders) {
      setErrorMessage(branchOperationalStatus.closureLabel ?? "Esta sucursal no esta aceptando pedidos en este momento.")
      return
    }

    if (product.variants.length > 0 && !selectedVariant) {
      setErrorMessage("Selecciona un tamano para continuar.")
      return
    }

    if (quantity > 0 && !validateDraftModifierSelections()) {
      return
    }

    if (configurations.length === 0) {
      setErrorMessage("Selecciona al menos una unidad para continuar.")
      return
    }

    if (initialItem) {
      setIsSubmitting(true)
      setErrorMessage("")
      await onConfigurationsReplaced?.({
        originalItemId: initialItem.id,
        productId: product.id,
        productVariantId: selectedVariant?.id ?? null,
        configurations,
      })
      setIsSubmitting(false)
      return
    }

    // Capture the flight before closing the sheet -- the clone lives in a fixed body-level
    // node, so it keeps animating on top of the sheet's own closing transition underneath it.
    if (imageContainerRef.current) {
      flyProductToBag(imageContainerRef.current, product.imageUrl)
    }

    const optimisticItems = configurations.map((configuration) =>
      buildOptimisticItem({ id: `optimistic-${crypto.randomUUID()}`, quantity: configuration.quantity, modifierSelections: configuration.modifierSelections })
    )

    for (const item of optimisticItems) {
      upsertItem(item)
      onItemAdded(item)
    }

    onOpenChange(false)
    pushToast({
      title: "Agregado a la bolsa",
      description: configurations.length > 1 ? `${totalUnits} x ${product.name} en ${configurations.length} combinaciones` : `${optimisticItems[0].quantity} x ${optimisticItems[0].name}`,
      variant: "success",
    })
    setIsSubmitting(true)
    setErrorMessage("")

    const result = await addCustomerBagItemConfigurationsAction({
      tenantSlug,
      branchId,
      productId: product.id,
      productVariantId: selectedVariant?.id ?? null,
      configurations,
    })

    if (!result.ok || !result.items) {
      for (const item of optimisticItems) {
        removeItem(item.id, tenantSlug, branchId)
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

    for (const item of optimisticItems) {
      removeItem(item.id, tenantSlug, branchId)
    }
    for (const item of result.items) {
      upsertItem(item)
      onItemAdded(item)
    }
    setIsSubmitting(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto border-l border-stone-200 bg-white data-[side=right]:w-full sm:data-[side=right]:max-w-xl">
        <SheetHeader className="border-b border-stone-100 px-6 py-5">
          <SheetTitle>{product.name}</SheetTitle>
          <SheetDescription>Configura tamano, cantidad y opciones disponibles antes de confirmar la bolsa.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div ref={imageContainerRef} className="flex aspect-square items-center justify-center overflow-hidden rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
              {product.imageUrl ? <Image alt={product.name} className="h-full w-full object-contain" height={520} src={product.imageUrl} unoptimized width={520} /> : null}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{product.category}</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">{product.description}</p>
              {product.comboComponents.length > 0 ? (
                <p className="mt-3 text-sm leading-6 text-stone-700">
                  <span className="font-semibold text-stone-950">Incluye: </span>
                  {product.comboComponents
                    .map((component) => `${component.quantity}x ${component.componentProductName}${component.componentVariantName ? ` (${component.componentVariantName})` : ""}`)
                    .join(", ")}
                </p>
              ) : null}
            </div>
          </div>

          {branchOperationalStatus && !branchOperationalStatus.acceptingOrders ? (
            <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Sucursal cerrada por ahora</p>
              <p className="mt-1 text-amber-800">{branchOperationalStatus.closureLabel ?? "No estamos aceptando pedidos en este momento."}</p>
              {branchOperationalStatus.nextTransitionLabel ? <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-amber-700">{branchOperationalStatus.nextTransitionLabel}</p> : null}
            </div>
          ) : null}

          {product.variants.length > 0 ? (
            <section className="space-y-3 rounded-[1.4rem] border border-stone-200 bg-stone-50/80 p-4">
              <div>
                <p className="text-sm font-semibold text-stone-950">Tamano</p>
                <p className="mt-1 text-xs text-stone-500">
                  {isMultiConfigMode ? "El tamano ya no se puede cambiar con combinaciones agregadas." : "Seleccion obligatoria para calcular el precio final."}
                </p>
              </div>
              <div className="grid gap-2">
                {product.variants.map((variant) => {
                  const isSelected = variant.id === selectedVariantId

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={isMultiConfigMode}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`flex items-center justify-between rounded-[1rem] border px-4 py-3 text-left transition ${
                        isMultiConfigMode ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                      } ${isSelected ? "border-orange-500 bg-orange-50 text-stone-950" : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"}`}
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
              <p className="mt-1 text-xs text-stone-500">
                {isMultiConfigMode ? "Cantidad para esta combinacion." : "Ajusta cuantas unidades quieres confirmar ahora."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setQuantity((current) => Math.max(current - 1, minQuantity))}>
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
                    <p className="text-sm font-semibold text-stone-950">{formatModifierGroupTitle(group.name, group.modifierKind)}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {isExclusionGroup(group.modifierKind)
                        ? `Marca lo que quieres quitar${group.maxSelect > 0 ? `, hasta ${group.maxSelect} opciones` : ""}.`
                        : group.selectionType === "single"
                          ? "Elige una opcion"
                          : `Elige entre ${group.minSelect} y ${group.maxSelect} opciones`}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {group.options.map((option) => {
                      const isSelected = (selectedOptionsByGroup[group.id] ?? []).includes(option.id)
                      const exclusionGroup = isExclusionGroup(group.modifierKind)

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

          {product.modifierGroups.length > 0 ? (
            <>
              {pendingConfigurations.length > 0 ? (
                <section className="space-y-2 rounded-[1.4rem] border border-stone-200 bg-stone-50/80 p-4">
                  <p className="text-sm font-semibold text-stone-950">Combinaciones agregadas</p>
                  <div className="space-y-2">
                    {pendingConfigurations.map((configuration) => (
                      <div key={configuration.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
                        <div>
                          <p className="font-semibold text-stone-950">
                            {configuration.quantity}x {selectedVariant ? `${product.name} · ${selectedVariant.name}` : product.name}
                          </p>
                          <p className="text-xs text-stone-500">
                            {configuration.modifierSelections.length > 0
                              ? configuration.modifierSelections
                                  .map((selection) => (isExclusionGroup(selection.modifierKind) ? formatExclusionAction(selection.modifierOptionName) : selection.modifierOptionName))
                                  .join(", ")
                              : "Sin personalizar"}
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleRemovePendingConfiguration(configuration.id)}>
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <Button type="button" variant="outline" className="w-full rounded-full" disabled={quantity < 1} onClick={handleAddAnotherConfiguration}>
                <Plus />
                Agregar otra combinacion
              </Button>
            </>
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
              disabled={isSubmitting || (product.variants.length > 0 && !selectedVariant) || Boolean(branchOperationalStatus && !branchOperationalStatus.acceptingOrders) || configurations.length === 0}
              onClick={() => void handleConfirm()}
            >
              <ShoppingBag />
              {isSubmitting ? "Guardando..." : isMultiConfigMode ? `Agregar ${totalUnits} a la bolsa` : submitLabel}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
