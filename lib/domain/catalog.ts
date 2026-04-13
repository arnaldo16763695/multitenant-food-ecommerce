import type { CatalogProduct } from "@/lib/config/admin-catalog"

export type CatalogProductStatus = CatalogProduct["status"]
export type CatalogBranchAvailabilityStatus = CatalogProduct["branchStatuses"][number]["availabilityStatus"]

export type CatalogBranchOverrideInput = {
  readonly branchId: string
  readonly availabilityStatus: CatalogBranchAvailabilityStatus
  readonly priceOverride: string
  readonly prepTimeMinutes: string
}

export type CatalogProductMutationInput = {
  readonly name: string
  readonly category: string
  readonly description: string
  readonly basePrice: string
  readonly status: CatalogProductStatus
  readonly primaryImagePath?: string
  readonly primaryImageAlt?: string
  readonly branchOverrides?: readonly CatalogBranchOverrideInput[]
}

export type CatalogCategoryVisibility = "Publica" | "Oculta"

export type CatalogCategoryMutationInput = {
  readonly name: string
  readonly visibility: CatalogCategoryVisibility
  readonly sortOrder: number
  readonly imagePath?: string
  readonly imageAlt?: string
}

export type CatalogMutationResult = {
  readonly ok: boolean
  readonly entityId?: string
  readonly error?: string
}

export function normalizeCatalogPrice(value: string) {
  const numericValue = Number(value.replace(/[^0-9.-]+/g, ""))

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null
  }

  return Number(numericValue.toFixed(2))
}

export function slugifyCatalogValue(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function toCatalogDbStatus(status: CatalogProductStatus) {
  return status === "Activo" ? "active" : "draft"
}

export function fromCatalogDbStatus(status: "active" | "draft") {
  return status === "active" ? "Activo" : "Draft"
}

export function toCatalogDbVisibility(visibility: CatalogCategoryVisibility) {
  return visibility === "Publica"
}

export function fromCatalogDbVisibility(isVisible: boolean) {
  return isVisible ? "Publica" : "Oculta"
}
