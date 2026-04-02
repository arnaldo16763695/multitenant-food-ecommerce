"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import { type CatalogMutationResult, type CatalogProductMutationInput } from "@/lib/domain/catalog"
import {
  createCatalogProduct,
  duplicateCatalogProduct,
  toggleCatalogProductStatus,
  updateCatalogProduct,
} from "@/lib/services/catalog"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function revalidateCatalogPaths(tenantSlug: string) {
  revalidatePath(`/app/${tenantSlug}/admin/catalog`)
  revalidatePath(`/app/${tenantSlug}/admin/catalog/products`)
}

export async function createProductAction(tenantSlug: string, payload: CatalogProductMutationInput): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await createCatalogProduct(supabase, access.membership.tenantId, payload)

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

  const result = await updateCatalogProduct(supabase, access.membership.tenantId, productId, payload)

  if (result.ok) {
    revalidateCatalogPaths(tenantSlug)
  }

  return result
}

export async function toggleProductStatusAction(productId: string, tenantSlug: string, currentStatus: "Activo" | "Draft"): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await toggleCatalogProductStatus(supabase, access.membership.tenantId, productId, currentStatus)

  if (result.ok) {
    revalidateCatalogPaths(tenantSlug)
  }

  return result
}

export async function duplicateProductAction(productId: string, tenantSlug: string): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await duplicateCatalogProduct(supabase, access.membership.tenantId, productId)

  if (result.ok) {
    revalidateCatalogPaths(tenantSlug)
  }

  return result
}
