"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import { type CatalogCategoryMutationInput, type CatalogMutationResult } from "@/lib/domain/catalog"
import { createCatalogCategory, updateCatalogCategory } from "@/lib/services/catalog"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function revalidateCategoryPaths(tenantSlug: string) {
  revalidatePath(`/app/${tenantSlug}/admin/catalog`)
  revalidatePath(`/app/${tenantSlug}/admin/catalog/categories`)
}

export async function createCategoryWithImageAction(tenantSlug: string, formData: FormData): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const categoryId = String(formData.get("categoryId") ?? "").trim()
  const imagePath = String(formData.get("imagePath") ?? "")
  const payload: CatalogCategoryMutationInput = {
    name: String(formData.get("name") ?? ""),
    visibility: String(formData.get("visibility") ?? "Publica") as CatalogCategoryMutationInput["visibility"],
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    imagePath,
    imageAlt: String(formData.get("imageAlt") ?? ""),
  }

  const result = await createCatalogCategory(
    supabase,
    access.membership.tenantId,
    {
      ...payload,
      imagePath,
    },
    categoryId ? { categoryId } : undefined
  )

  if (result.ok) {
    revalidateCategoryPaths(tenantSlug)
  }

  return result
}

export async function updateCategoryWithImageAction(categoryId: string, tenantSlug: string, formData: FormData): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const imagePath = String(formData.get("imagePath") ?? "")
  const payload: CatalogCategoryMutationInput = {
    name: String(formData.get("name") ?? ""),
    visibility: String(formData.get("visibility") ?? "Publica") as CatalogCategoryMutationInput["visibility"],
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    imagePath,
    imageAlt: String(formData.get("imageAlt") ?? ""),
  }

  const result = await updateCatalogCategory(supabase, access.membership.tenantId, categoryId, {
    ...payload,
    imagePath,
  })

  if (result.ok) {
    revalidateCategoryPaths(tenantSlug)
  }

  return result
}
