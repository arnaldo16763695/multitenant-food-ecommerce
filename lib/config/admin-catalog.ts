export type CatalogBranchStatus = {
  readonly branchName: string
  readonly availability: "Disponible" | "Pausado" | "Sin stock"
  readonly price: string
  readonly prepTime: string
}

export type CatalogProduct = {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly description: string
  readonly basePrice: string
  readonly status: "Activo" | "Draft"
  readonly primaryImagePath?: string | null
  readonly primaryImageUrl?: string | null
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
  readonly name: string
  readonly type: "Single" | "Multiple"
  readonly appliedTo: string
}

export const catalogProducts: readonly CatalogProduct[] = [
  {
    id: "prod-fire-smash",
    name: "Fire Smash Burger",
    category: "Burgers",
    description: "Doble carne, queso americano, salsa signature y pickles.",
    basePrice: "$ 11.90",
    status: "Activo",
    primaryImagePath: "tenants/demo-brand/products/fire-smash-burger/primary/cover.jpg",
    primaryImageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    modifierGroups: ["Punto de carne", "Extras", "Salsas"],
    tags: ["Best seller", "Combo ready"],
    branchStatuses: [
      { branchName: "Centro", availability: "Disponible", price: "$ 11.90", prepTime: "12 min" },
      { branchName: "Norte", availability: "Pausado", price: "$ 12.40", prepTime: "15 min" },
      { branchName: "Este", availability: "Disponible", price: "$ 11.90", prepTime: "13 min" },
    ],
  },
  {
    id: "prod-crispy-box",
    name: "Crispy Box",
    category: "Combos",
    description: "Pollo crispy, papas medianas, bebida y dip incluido.",
    basePrice: "$ 14.50",
    status: "Activo",
    primaryImagePath: "tenants/demo-brand/products/crispy-box/primary/cover.jpg",
    primaryImageUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=900&q=80",
    modifierGroups: ["Bebidas", "Salsas"],
    tags: ["Lunch", "High rotation"],
    branchStatuses: [
      { branchName: "Centro", availability: "Disponible", price: "$ 14.50", prepTime: "14 min" },
      { branchName: "Norte", availability: "Disponible", price: "$ 14.90", prepTime: "16 min" },
      { branchName: "Este", availability: "Sin stock", price: "$ 14.50", prepTime: "-" },
    ],
  },
  {
    id: "prod-lime-wrap",
    name: "Lime Chicken Wrap",
    category: "Wraps",
    description: "Wrap de pollo grillado con aderezo citrico y mix de hojas.",
    basePrice: "$ 9.80",
    status: "Draft",
    primaryImagePath: "tenants/demo-brand/products/lime-chicken-wrap/primary/cover.jpg",
    primaryImageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
    modifierGroups: ["Extras", "Aderezos"],
    tags: ["Healthy", "Seasonal"],
    branchStatuses: [
      { branchName: "Centro", availability: "Pausado", price: "$ 9.80", prepTime: "11 min" },
      { branchName: "Norte", availability: "Disponible", price: "$ 10.10", prepTime: "12 min" },
      { branchName: "Este", availability: "Disponible", price: "$ 9.80", prepTime: "11 min" },
    ],
  },
  {
    id: "prod-spark-cola",
    name: "Spark Cola",
    category: "Bebidas",
    description: "Refresco individual disponible para combos y venta directa.",
    basePrice: "$ 2.90",
    status: "Activo",
    primaryImagePath: "tenants/demo-brand/products/spark-cola/primary/cover.jpg",
    primaryImageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80",
    modifierGroups: ["Tamano"],
    tags: ["Upsell"],
    branchStatuses: [
      { branchName: "Centro", availability: "Disponible", price: "$ 2.90", prepTime: "2 min" },
      { branchName: "Norte", availability: "Disponible", price: "$ 2.90", prepTime: "2 min" },
      { branchName: "Este", availability: "Disponible", price: "$ 3.10", prepTime: "2 min" },
    ],
  },
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
  { name: "Extras", type: "Multiple", appliedTo: "6 productos" },
  { name: "Salsas", type: "Multiple", appliedTo: "12 productos" },
  { name: "Bebidas", type: "Single", appliedTo: "5 combos" },
  { name: "Tamano", type: "Single", appliedTo: "9 bebidas" },
] as const
