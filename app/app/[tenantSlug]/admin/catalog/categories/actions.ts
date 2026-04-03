"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import { type CatalogCategoryMutationInput, type CatalogMutationResult } from "@/lib/domain/catalog"
import { createCatalogCategory, updateCatalogCategory } from "@/lib/services/catalog"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { buildCategoryImagePath, getCatalogMediaBucket, getFileExtension } from "@/lib/supabase/storage"

function revalidateCategoryPaths(tenantSlug: string) {
  revalidatePath(`/app/${tenantSlug}/admin/catalog`)
  revalidatePath(`/app/${tenantSlug}/admin/catalog/categories`)
}

async function uploadCategoryImage(tenantId: string, categoryId: string, file: File, previousPath?: string) {
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const fileExtension = getFileExtension(file.name)
  const nextPath = buildCategoryImagePath(tenantId, categoryId, `cover.${fileExtension}`)
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

export async function createCategoryWithImageAction(tenantSlug: string, formData: FormData): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const categoryId = randomUUID()
  const imageFile = formData.get("imageFile")
  let imagePath = String(formData.get("imagePath") ?? "")
  const payload: CatalogCategoryMutationInput = {
    name: String(formData.get("name") ?? ""),
    visibility: String(formData.get("visibility") ?? "Publica") as CatalogCategoryMutationInput["visibility"],
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    imagePath,
    imageAlt: String(formData.get("imageAlt") ?? ""),
  }

  if (imageFile instanceof File && imageFile.size > 0) {
    imagePath = await uploadCategoryImage(access.membership.tenantId, categoryId, imageFile)
  }

  const result = await createCatalogCategory(
    supabase,
    access.membership.tenantId,
    {
      ...payload,
      imagePath,
    },
    { categoryId }
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

  const imageFile = formData.get("imageFile")
  const previousImagePath = String(formData.get("previousImagePath") ?? "")
  let imagePath = String(formData.get("imagePath") ?? "")
  const payload: CatalogCategoryMutationInput = {
    name: String(formData.get("name") ?? ""),
    visibility: String(formData.get("visibility") ?? "Publica") as CatalogCategoryMutationInput["visibility"],
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    imagePath,
    imageAlt: String(formData.get("imageAlt") ?? ""),
  }

  if (imageFile instanceof File && imageFile.size > 0) {
    imagePath = await uploadCategoryImage(access.membership.tenantId, categoryId, imageFile, previousImagePath || undefined)
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
