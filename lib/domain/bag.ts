export type ShoppingBagModifierSelection = {
  readonly modifierGroupId: string
  readonly modifierGroupName: string
  readonly modifierKind: "ingredient" | "addon" | "choice"
  readonly modifierOptionId: string
  readonly modifierOptionName: string
  readonly priceDelta: number
  readonly priceDeltaLabel: string
}

export type ShoppingBagItem = {
  readonly id: string
  readonly productId: string
  readonly productVariantId?: string | null
  readonly variantName?: string | null
  readonly tenantSlug: string
  readonly branchId: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly unitPrice: number
  readonly unitPriceLabel: string
  readonly quantity: number
  readonly modifierSelections: readonly ShoppingBagModifierSelection[]
}

export type ShoppingBagMutationResult = {
  readonly ok: boolean
  readonly error?: string
  readonly item?: ShoppingBagItem
  readonly quantity?: number
}
