"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"

import { requireAdminAccess } from "@/lib/auth/admin"
import { type CatalogMutationResult, type CatalogProductMutationInput } from "@/lib/domain/catalog"
import {
  createCatalogProduct,
  createCatalogProductWithOptions,
  duplicateCatalogProduct,
  toggleCatalogProductStatus,
  updateCatalogProduct,
} from "@/lib/services/catalog"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { buildProductPrimaryImagePath, getCatalogMediaBucket, getFileExtension } from "@/lib/supabase/storage"

function revalidateCatalogPaths(tenantSlug: string) {
  revalidatePath(`/app/${tenantSlug}/admin/catalog`)
  revalidatePath(`/app/${tenantSlug}/admin/catalog/products`)
}

async function uploadPrimaryProductImage(tenantId: string, productId: string, file: File, previousPath?: string) {
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const fileExtension = getFileExtension(file.name)
  const nextPath = buildProductPrimaryImagePath(tenantId, productId, `cover.${fileExtension}`)
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const uploadResult = await adminClient.storage.from(getCatalogMediaBucket()).upload(nextPath, fileBuffer, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
    upsert: true,
  })

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message)
  }

  if (previousPath && previousPath !== nextPath) {
    await adminClient.storage.from(getCatalogMediaBucket()).remove([previousPath])
  }

  return nextPath
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

export async function createProductWithImageAction(tenantSlug: string, formData: FormData): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const productId = randomUUID()
  const imageFile = formData.get("primaryImageFile")
  let primaryImagePath = String(formData.get("primaryImagePath") ?? "")
  const payload: CatalogProductMutationInput = {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    description: String(formData.get("description") ?? ""),
    basePrice: String(formData.get("basePrice") ?? ""),
    status: String(formData.get("status") ?? "Draft") as CatalogProductMutationInput["status"],
    primaryImagePath,
    primaryImageAlt: String(formData.get("primaryImageAlt") ?? ""),
  }

  if (imageFile instanceof File && imageFile.size > 0) {
    primaryImagePath = await uploadPrimaryProductImage(access.membership.tenantId, productId, imageFile)
  }

  const result = await createCatalogProductWithOptions(
    supabase,
    access.membership.tenantId,
    {
      ...payload,
      primaryImagePath,
    },
    { productId }
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

  const result = await updateCatalogProduct(supabase, access.membership.tenantId, productId, payload)

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

  const imageFile = formData.get("primaryImageFile")
  const previousImagePath = String(formData.get("previousPrimaryImagePath") ?? "")
  let primaryImagePath = String(formData.get("primaryImagePath") ?? "")
  const payload: CatalogProductMutationInput = {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    description: String(formData.get("description") ?? ""),
    basePrice: String(formData.get("basePrice") ?? ""),
    status: String(formData.get("status") ?? "Draft") as CatalogProductMutationInput["status"],
    primaryImagePath,
    primaryImageAlt: String(formData.get("primaryImageAlt") ?? ""),
  }

  if (imageFile instanceof File && imageFile.size > 0) {
    primaryImagePath = await uploadPrimaryProductImage(access.membership.tenantId, productId, imageFile, previousImagePath || undefined)
  }

  const result = await updateCatalogProduct(supabase, access.membership.tenantId, productId, {
    ...payload,
    primaryImagePath,
  })

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
