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

// A distinct quantity + modifier combination the customer wants for one product/variant --
// e.g. "2 sin cebolla" and "1 sin mostaza" are two configurations of the same burger. Each
// configuration is persisted as its own customer_bag_items row (see buildConfigurationHash).
export type ShoppingBagConfiguration = {
  readonly quantity: number
  readonly modifierSelections: readonly ShoppingBagModifierSelection[]
}

export type ShoppingBagConfigurationsMutationResult = {
  readonly ok: boolean
  readonly error?: string
  readonly items?: readonly ShoppingBagItem[]
}
