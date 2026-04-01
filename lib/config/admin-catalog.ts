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
  readonly modifierGroups: readonly string[]
  readonly tags: readonly string[]
  readonly branchStatuses: readonly CatalogBranchStatus[]
}

export type CatalogCategory = {
  readonly name: string
  readonly itemCount: number
  readonly visibility: "Publica" | "Oculta"
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
  { name: "Burgers", itemCount: 8, visibility: "Publica" },
  { name: "Combos", itemCount: 5, visibility: "Publica" },
  { name: "Wraps", itemCount: 4, visibility: "Publica" },
  { name: "Bebidas", itemCount: 9, visibility: "Oculta" },
] as const

export const catalogModifierGroups: readonly CatalogModifierGroup[] = [
  { name: "Extras", type: "Multiple", appliedTo: "6 productos" },
  { name: "Salsas", type: "Multiple", appliedTo: "12 productos" },
  { name: "Bebidas", type: "Single", appliedTo: "5 combos" },
  { name: "Tamano", type: "Single", appliedTo: "9 bebidas" },
] as const
