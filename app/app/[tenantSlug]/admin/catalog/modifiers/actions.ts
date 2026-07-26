"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import { canManageCatalogMaster } from "@/lib/auth/permissions"
import { type CatalogModifierGroupMutationInput, type CatalogMutationResult } from "@/lib/domain/catalog"
import { buildAuditActor } from "@/lib/services/audit"
import { createCatalogModifierGroup, updateCatalogModifierGroup } from "@/lib/services/catalog"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function revalidateModifierPaths(tenantSlug: string) {
  revalidatePath(`/app/${tenantSlug}/admin/catalog`)
  revalidatePath(`/app/${tenantSlug}/admin/catalog/modifiers`)
  revalidatePath(`/app/${tenantSlug}/admin/catalog/products`)
}

function parseModifierOptions(formData: FormData): CatalogModifierGroupMutationInput["options"] {
  const rawValue = formData.get("options")

  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .filter((value): value is CatalogModifierGroupMutationInput["options"][number] => {
        return Boolean(value) && typeof value === "object" && typeof value.name === "string" && typeof value.priceDelta === "string" && typeof value.sortOrder === "number"
      })
      .map((value) => ({
        id: typeof value.id === "string" ? value.id : undefined,
        name: value.name,
        priceDelta: value.priceDelta,
        sortOrder: value.sortOrder,
      }))
  } catch {
    return []
  }
}

function parseModifierGroupPayload(formData: FormData): CatalogModifierGroupMutationInput {
  return {
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "Multiple") as CatalogModifierGroupMutationInput["type"],
    minSelect: Number(formData.get("minSelect") ?? 0),
    maxSelect: Number(formData.get("maxSelect") ?? 1),
    options: parseModifierOptions(formData),
  }
}

export async function createModifierGroupAction(tenantSlug: string, formData: FormData): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogMaster(access.membership.role)) {
    return { ok: false, error: "Solo owner y manager pueden crear modificadores." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const modifierGroupId = String(formData.get("modifierGroupId") ?? "").trim()
  const result = await createCatalogModifierGroup(
    supabase,
    access.membership.tenantId,
    parseModifierGroupPayload(formData),
    modifierGroupId ? { modifierGroupId } : undefined,
    buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidateModifierPaths(tenantSlug)
  }

  return result
}

export async function updateModifierGroupAction(modifierGroupId: string, tenantSlug: string, formData: FormData): Promise<CatalogMutationResult> {
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogMaster(access.membership.role)) {
    return { ok: false, error: "Solo owner y manager pueden editar modificadores." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await updateCatalogModifierGroup(
    supabase,
    access.membership.tenantId,
    modifierGroupId,
    parseModifierGroupPayload(formData),
    buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidateModifierPaths(tenantSlug)
  }

  return result
}
