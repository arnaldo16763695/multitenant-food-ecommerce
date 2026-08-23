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

export const catalogProducts: readonly CatalogProduct[] = [
  {
    id: "prod-fire-smash",
    name: "Fire Smash Burger",
    category: "Burgers",
    description: "Doble carne, queso americano, salsa signature y pickles.",
    basePrice: "$ 11.90",
    hasVariants: false,
    variants: [],
    status: "Activo",
    primaryImagePath: "tenants/demo-brand/products/fire-smash-burger/primary/cover.jpg",
    primaryImageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    modifierGroupIds: ["mod-extras", "mod-salsas"],
    modifierGroups: ["Punto de carne", "Extras", "Salsas"],
    tags: ["Best seller", "Combo ready"],
    branchStatuses: [
      { branchId: "branch-centro", branchName: "Centro", availabilityStatus: "available", availability: "Disponible", priceOverride: "", price: "$ 11.90", prepTimeMinutes: "12", prepTime: "12 min" },
      { branchId: "branch-norte", branchName: "Norte", availabilityStatus: "paused", availability: "Pausado", priceOverride: "12.40", price: "$ 12.40", prepTimeMinutes: "15", prepTime: "15 min" },
      { branchId: "branch-este", branchName: "Este", availabilityStatus: "available", availability: "Disponible", priceOverride: "", price: "$ 11.90", prepTimeMinutes: "13", prepTime: "13 min" },
    ],
  },
  {
    id: "prod-crispy-box",
    name: "Crispy Box",
    category: "Combos",
    description: "Pollo crispy, papas medianas, bebida y dip incluido.",
    basePrice: "$ 14.50",
    hasVariants: false,
    variants: [],
    status: "Activo",
    primaryImagePath: "tenants/demo-brand/products/crispy-box/primary/cover.jpg",
    primaryImageUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=900&q=80",
    modifierGroupIds: ["mod-bebidas", "mod-salsas"],
    modifierGroups: ["Bebidas", "Salsas"],
    tags: ["Lunch", "High rotation"],
    branchStatuses: [
      { branchId: "branch-centro", branchName: "Centro", availabilityStatus: "available", availability: "Disponible", priceOverride: "", price: "$ 14.50", prepTimeMinutes: "14", prepTime: "14 min" },
      { branchId: "branch-norte", branchName: "Norte", availabilityStatus: "available", availability: "Disponible", priceOverride: "14.90", price: "$ 14.90", prepTimeMinutes: "16", prepTime: "16 min" },
      { branchId: "branch-este", branchName: "Este", availabilityStatus: "out_of_stock", availability: "Sin stock", priceOverride: "", price: "$ 14.50", prepTimeMinutes: "", prepTime: "-" },
    ],
  },
  {
    id: "prod-lime-wrap",
    name: "Lime Chicken Wrap",
    category: "Wraps",
    description: "Wrap de pollo grillado con aderezo citrico y mix de hojas.",
    basePrice: "$ 9.80",
    hasVariants: false,
    variants: [],
    status: "Draft",
    primaryImagePath: "tenants/demo-brand/products/lime-chicken-wrap/primary/cover.jpg",
    primaryImageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
    modifierGroupIds: ["mod-extras"],
    modifierGroups: ["Extras", "Aderezos"],
    tags: ["Healthy", "Seasonal"],
    branchStatuses: [
      { branchId: "branch-centro", branchName: "Centro", availabilityStatus: "paused", availability: "Pausado", priceOverride: "", price: "$ 9.80", prepTimeMinutes: "11", prepTime: "11 min" },
      { branchId: "branch-norte", branchName: "Norte", availabilityStatus: "available", availability: "Disponible", priceOverride: "10.10", price: "$ 10.10", prepTimeMinutes: "12", prepTime: "12 min" },
      { branchId: "branch-este", branchName: "Este", availabilityStatus: "available", availability: "Disponible", priceOverride: "", price: "$ 9.80", prepTimeMinutes: "11", prepTime: "11 min" },
    ],
  },
  {
    id: "prod-spark-cola",
    name: "Spark Cola",
    category: "Bebidas",
    description: "Refresco individual disponible para combos y venta directa.",
    basePrice: "$ 2.90",
    hasVariants: false,
    variants: [],
    status: "Activo",
    primaryImagePath: "tenants/demo-brand/products/spark-cola/primary/cover.jpg",
    primaryImageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80",
    modifierGroupIds: ["mod-tamano"],
    modifierGroups: ["Tamano"],
    tags: ["Upsell"],
    branchStatuses: [
      { branchId: "branch-centro", branchName: "Centro", availabilityStatus: "available", availability: "Disponible", priceOverride: "", price: "$ 2.90", prepTimeMinutes: "2", prepTime: "2 min" },
      { branchId: "branch-norte", branchName: "Norte", availabilityStatus: "available", availability: "Disponible", priceOverride: "", price: "$ 2.90", prepTimeMinutes: "2", prepTime: "2 min" },
      { branchId: "branch-este", branchName: "Este", availabilityStatus: "available", availability: "Disponible", priceOverride: "3.10", price: "$ 3.10", prepTimeMinutes: "2", prepTime: "2 min" },
    ],
  },
] as const

export const catalogBranches: readonly CatalogBranchOption[] = [
  { id: "branch-centro", name: "Centro" },
  { id: "branch-norte", name: "Norte" },
  { id: "branch-este", name: "Este" },
] as const

export const catalogCategories: readonly CatalogCategory[] = [
  {
    id: "cat-burgers",
    name: "Burgers",
    itemCount: 8,
    visibility: "Publica",
    sortOrder: 1,
    imagePath: "tenants/demo-brand/categories/burgers/cover.jpg",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "cat-combos",
    name: "Combos",
    itemCount: 5,
    visibility: "Publica",
    sortOrder: 2,
    imagePath: "tenants/demo-brand/categories/combos/cover.jpg",
    imageUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "cat-wraps",
    name: "Wraps",
    itemCount: 4,
    visibility: "Publica",
    sortOrder: 3,
    imagePath: "tenants/demo-brand/categories/wraps/cover.jpg",
    imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "cat-bebidas",
    name: "Bebidas",
    itemCount: 9,
    visibility: "Oculta",
    sortOrder: 4,
    imagePath: "tenants/demo-brand/categories/bebidas/cover.jpg",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
  },
] as const

export const catalogModifierGroups: readonly CatalogModifierGroup[] = [
  { id: "mod-extras", name: "Extras", type: "Multiple", modifierKind: "addon", appliedTo: "6 productos", minSelect: 0, maxSelect: 3, optionCount: 3, options: [{ id: "opt-extra-queso", name: "Extra queso", priceDelta: "$ 1.20", defaultSelected: false }] },
  { id: "mod-salsas", name: "Salsas", type: "Multiple", modifierKind: "choice", appliedTo: "12 productos", minSelect: 0, maxSelect: 2, optionCount: 3, options: [{ id: "opt-bbq", name: "BBQ", priceDelta: "$ 0.00", defaultSelected: false }] },
  { id: "mod-bebidas", name: "Bebidas", type: "Single", modifierKind: "choice", appliedTo: "5 combos", minSelect: 1, maxSelect: 1, optionCount: 3, options: [{ id: "opt-cola-1l", name: "Cola 1L", priceDelta: "$ 0.00", defaultSelected: true }] },
  { id: "mod-tamano", name: "Tamano", type: "Single", modifierKind: "choice", appliedTo: "9 bebidas", minSelect: 1, maxSelect: 1, optionCount: 3, options: [{ id: "opt-individual", name: "Individual", priceDelta: "$ 0.00", defaultSelected: true }] },
] as const
