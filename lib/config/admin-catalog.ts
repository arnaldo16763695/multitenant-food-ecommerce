export type CatalogBranchOption = {
  readonly id: string
  readonly name: string
}

export type CatalogBranchStatus = {
  readonly branchId: string
  readonly branchName: string
  readonly availabilityStatus: "available" | "paused" | "out_of_stock"
  readonly availability: "Disponible" | "Pausado" | "Sin stock"
  readonly priceOverride: string
  readonly price: string
  readonly prepTimeMinutes: string
  readonly prepTime: string
}

export type CatalogComboComponent = {
  readonly id: string
  readonly componentProductId: string
  readonly componentProductName: string
  readonly componentVariantId: string | null
  readonly componentVariantName: string | null
  readonly quantity: number
}

export type CatalogProduct = {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly description: string
  readonly basePrice: string
  readonly hasVariants: boolean
  readonly variants: readonly {
    id: string
    name: string
    basePrice: string
    isDefault: boolean
    branchStatuses: readonly CatalogBranchStatus[]
  }[]
  readonly status: "Activo" | "Draft"
  readonly primaryImagePath?: string | null
  readonly primaryImageUrl?: string | null
  readonly modifierGroupIds: readonly string[]
  readonly modifierGroups: readonly string[]
  readonly tags: readonly string[]
  readonly branchStatuses: readonly CatalogBranchStatus[]
  readonly isCombo: boolean
  readonly comboComponents: readonly CatalogComboComponent[]
}

export type CatalogCategory = {
  readonly id: string
  readonly name: string
  readonly itemCount: number
  readonly visibility: "Publica" | "Oculta"
  readonly sortOrder?: number
  readonly imagePath?: string | null
  readonly imageUrl?: string | null
}

export type CatalogModifierGroup = {
  readonly id: string
  readonly name: string
  readonly type: "Single" | "Multiple"
  readonly modifierKind: "ingredient" | "addon" | "choice"
  readonly appliedTo: string
  readonly minSelect: number
  readonly maxSelect: number
  readonly optionCount: number
  readonly options: readonly {
    id: string
    name: string
    priceDelta: string
    defaultSelected: boolean
  }[]
}
