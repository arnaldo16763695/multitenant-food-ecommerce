"use server"

import type { SupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import { canManageCatalogMaster } from "@/lib/auth/permissions"
import { type CatalogBranchOverrideInput, type CatalogComboComponentInput, type CatalogMutationResult, type CatalogProductMutationInput, type CatalogProductVariantInput, type CatalogVariantBranchOverrideInput } from "@/lib/domain/catalog"
import { buildAuditActor, type AuditActor } from "@/lib/services/audit"
import {
  createCatalogProduct,
  createCatalogProductWithOptions,
  duplicateCatalogProduct,
  toggleCatalogProductStatus,
  updateCatalogProduct,
  updateCatalogProductBranchOverrides,
  updateCatalogProductVariantBranchOverrides,
} from "@/lib/services/catalog"
import { getActiveBranchIdsForMembership } from "@/lib/services/staff"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function revalidateCatalogPaths(tenantSlug: string) {
  revalidatePath(`/app/${tenantSlug}/admin/catalog`)
  revalidatePath(`/app/${tenantSlug}/admin/catalog/products`)
}

function parseBranchOverrides(formData: FormData): readonly CatalogBranchOverrideInput[] {
  const rawValue = formData.get("branchOverrides")

  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .filter((value): value is CatalogBranchOverrideInput => {
        return (
          Boolean(value) &&
          typeof value === "object" &&
          typeof value.branchId === "string" &&
          typeof value.availabilityStatus === "string" &&
          typeof value.priceOverride === "string" &&
          typeof value.prepTimeMinutes === "string"
        )
      })
      .map((value) => ({
        branchId: value.branchId,
        availabilityStatus: value.availabilityStatus,
        priceOverride: value.priceOverride,
        prepTimeMinutes: value.prepTimeMinutes,
      }))
  } catch {
    return []
  }
}

function parseVariantBranchOverrides(formData: FormData): readonly CatalogVariantBranchOverrideInput[] {
  const rawValue = formData.get("variantBranchOverrides")

  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .filter((value): value is CatalogVariantBranchOverrideInput => {
        return (
          Boolean(value) &&
          typeof value === "object" &&
          typeof value.variantId === "string" &&
          typeof value.branchId === "string" &&
          typeof value.availabilityStatus === "string" &&
          typeof value.priceOverride === "string" &&
          typeof value.prepTimeMinutes === "string"
        )
      })
      .map((value) => ({
        variantId: value.variantId,
        branchId: value.branchId,
        availabilityStatus: value.availabilityStatus,
        priceOverride: value.priceOverride,
        prepTimeMinutes: value.prepTimeMinutes,
      }))
  } catch {
    return []
  }
}

function parseVariants(formData: FormData): readonly CatalogProductVariantInput[] {
  const rawValue = formData.get("variants")

  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .filter((value): value is CatalogProductVariantInput => {
        return Boolean(value) && typeof value === "object" && typeof value.name === "string" && typeof value.basePrice === "string" && typeof value.isDefault === "boolean" && typeof value.sortOrder === "number"
      })
      .map((value) => ({
        id: typeof value.id === "string" ? value.id : undefined,
        name: value.name,
        basePrice: value.basePrice,
        isDefault: value.isDefault,
        sortOrder: value.sortOrder,
      }))
  } catch {
    return []
  }
}

function parseComboComponents(formData: FormData): readonly CatalogComboComponentInput[] {
  const rawValue = formData.get("comboComponents")

  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .filter((value): value is CatalogComboComponentInput => {
        return (
          Boolean(value) &&
          typeof value === "object" &&
          typeof value.componentProductId === "string" &&
          typeof value.quantity === "number" &&
          typeof value.sortOrder === "number"
        )
      })
      .map((value) => ({
        componentProductId: value.componentProductId,
        componentVariantId: typeof value.componentVariantId === "string" ? value.componentVariantId : null,
        quantity: value.quantity,
        sortOrder: value.sortOrder,
      }))
  } catch {
    return []
  }
}

function parseModifierGroupIds(formData: FormData): readonly string[] {
  const rawValue = formData.get("modifierGroupIds")

  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
  } catch {
    return []
  }
}

// branch_manager can only touch branch-scoped data (product-level and, when the product has
// variants, variant-level overrides) -- never the master catalog fields. Run both writes
// sequentially and stop at the first failure so a partial save never looks like a success.
async function applyBranchManagerCatalogOverrides(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
  payload: CatalogProductMutationInput,
  allowedBranchIds: readonly string[],
  auditActor: AuditActor
): Promise<CatalogMutationResult> {
  const branchOverridesResult = await updateCatalogProductBranchOverrides(
    supabase,
    tenantId,
    productId,
    payload.branchOverrides ?? [],
    allowedBranchIds,
    auditActor
  )

  if (!branchOverridesResult.ok) {
    return branchOverridesResult
  }

  const variantBranchOverrides = payload.variantBranchOverrides ?? []

  if (!variantBranchOverrides.length) {
    return branchOverridesResult
  }

  return updateCatalogProductVariantBranchOverrides(supabase, tenantId, productId, variantBranchOverrides, allowedBranchIds, auditActor)
}

export async function createProductAction(tenantSlug: string, payload: CatalogProductMutationInput): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogMaster(access.membership.role)) {
    return { ok: false, error: "Solo owner y manager pueden crear productos." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const auditActor = buildAuditActor({
    surface: "admin",
    profileId: access.profile.id,
    membershipId: access.membership.id,
    name: access.profile.fullName,
    role: access.membership.role,
  })

  const result = await createCatalogProduct(supabase, access.membership.tenantId, payload, auditActor)

  if (result.ok) {
    revalidateCatalogPaths(tenantSlug)
  }

  return result
}

export async function createProductWithImageAction(tenantSlug: string, formData: FormData): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogMaster(access.membership.role)) {
    return { ok: false, error: "Solo owner y manager pueden crear productos." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const productId = String(formData.get("productId") ?? "").trim()
  const primaryImagePath = String(formData.get("primaryImagePath") ?? "")
  const payload: CatalogProductMutationInput = {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    description: String(formData.get("description") ?? ""),
    basePrice: String(formData.get("basePrice") ?? ""),
    variants: parseVariants(formData),
    modifierGroupIds: parseModifierGroupIds(formData),
    status: String(formData.get("status") ?? "Draft") as CatalogProductMutationInput["status"],
    primaryImagePath,
    primaryImageAlt: String(formData.get("primaryImageAlt") ?? ""),
    branchOverrides: parseBranchOverrides(formData),
    isCombo: formData.get("isCombo") === "true",
    comboComponents: parseComboComponents(formData),
  }

  const result = await createCatalogProductWithOptions(
    supabase,
    access.membership.tenantId,
    {
      ...payload,
      primaryImagePath,
    },
    productId ? { productId } : undefined,
    buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidateCatalogPaths(tenantSlug)
  }

  return result
}

export async function updateProductAction(productId: string, tenantSlug: string, payload: CatalogProductMutationInput): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = canManageCatalogMaster(access.membership.role)
    ? await updateCatalogProduct(
        supabase,
        access.membership.tenantId,
        productId,
        payload,
        buildAuditActor({
          surface: "admin",
          profileId: access.profile.id,
          membershipId: access.membership.id,
          name: access.profile.fullName,
          role: access.membership.role,
        })
      )
    : await applyBranchManagerCatalogOverrides(
        supabase,
        access.membership.tenantId,
        productId,
        payload,
        await getActiveBranchIdsForMembership(supabase, access.membership.id),
        buildAuditActor({
          surface: "admin",
          profileId: access.profile.id,
          membershipId: access.membership.id,
          name: access.profile.fullName,
          role: access.membership.role,
        })
      )

  if (result.ok) {
    revalidateCatalogPaths(tenantSlug)
  }

  return result
}

export async function updateProductWithImageAction(productId: string, tenantSlug: string, formData: FormData): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const primaryImagePath = String(formData.get("primaryImagePath") ?? "")
  const payload: CatalogProductMutationInput = {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    description: String(formData.get("description") ?? ""),
    basePrice: String(formData.get("basePrice") ?? ""),
    variants: parseVariants(formData),
    modifierGroupIds: parseModifierGroupIds(formData),
    status: String(formData.get("status") ?? "Draft") as CatalogProductMutationInput["status"],
    primaryImagePath,
    primaryImageAlt: String(formData.get("primaryImageAlt") ?? ""),
    branchOverrides: parseBranchOverrides(formData),
    variantBranchOverrides: parseVariantBranchOverrides(formData),
    isCombo: formData.get("isCombo") === "true",
    comboComponents: parseComboComponents(formData),
  }

  const result = canManageCatalogMaster(access.membership.role)
    ? await updateCatalogProduct(supabase, access.membership.tenantId, productId, {
        ...payload,
        primaryImagePath,
      },
      buildAuditActor({
        surface: "admin",
        profileId: access.profile.id,
        membershipId: access.membership.id,
        name: access.profile.fullName,
        role: access.membership.role,
      }))
    : await applyBranchManagerCatalogOverrides(
        supabase,
        access.membership.tenantId,
        productId,
        payload,
        await getActiveBranchIdsForMembership(supabase, access.membership.id),
        buildAuditActor({
          surface: "admin",
          profileId: access.profile.id,
          membershipId: access.membership.id,
          name: access.profile.fullName,
          role: access.membership.role,
        })
      )

  if (result.ok) {
    revalidateCatalogPaths(tenantSlug)
  }

  return result
}

export async function toggleProductStatusAction(productId: string, tenantSlug: string, currentStatus: "Activo" | "Draft"): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogMaster(access.membership.role)) {
    return { ok: false, error: "Solo owner y manager pueden cambiar el estado global del producto." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await toggleCatalogProductStatus(
    supabase,
    access.membership.tenantId,
    productId,
    currentStatus,
    buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidateCatalogPaths(tenantSlug)
  }

  return result
}

export async function duplicateProductAction(productId: string, tenantSlug: string): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogMaster(access.membership.role)) {
    return { ok: false, error: "Solo owner y manager pueden duplicar productos." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await duplicateCatalogProduct(
    supabase,
    access.membership.tenantId,
    productId,
    buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidateCatalogPaths(tenantSlug)
  }

  return result
}
