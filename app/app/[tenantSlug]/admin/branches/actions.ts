"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getCatalogMediaBucket, getCatalogMediaPathFromUrl } from "@/lib/supabase/storage"

type UpdateBranchStorefrontHeroResult = {
  readonly ok: boolean
  readonly error?: string
}

function canManageBranchStorefront(role: string) {
  return role === "owner" || role === "manager" || role === "branch_manager"
}

function revalidateBranchStorefrontPaths(tenantSlug: string) {
  revalidatePath(`/app/${tenantSlug}`)
  revalidatePath(`/app/${tenantSlug}/admin/branches`)
  revalidatePath(`/brands`)
}

export async function updateBranchStorefrontHeroAction(
  tenantSlug: string,
  branchId: string,
  formData: FormData
): Promise<UpdateBranchStorefrontHeroResult> {
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageBranchStorefront(access.membership.role)) {
    return { ok: false, error: "No tienes permisos para editar el hero de esta sucursal." }
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const branchResult = await adminClient
    .from("branches")
    .select("id, tenant_id, hero_image_url")
    .eq("id", branchId)
    .limit(1)
    .maybeSingle<{
      id: string
      tenant_id: string
      hero_image_url: string | null
    }>()

  if (branchResult.error || !branchResult.data || branchResult.data.tenant_id !== access.membership.tenantId) {
    return { ok: false, error: "No pudimos encontrar la sucursal indicada." }
  }

  if (access.membership.role === "branch_manager") {
    const membershipResult = await adminClient
      .from("branch_memberships")
      .select("branch_id")
      .eq("tenant_membership_id", access.membership.id)
      .eq("branch_id", branchId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle<{ branch_id: string }>()

    if (membershipResult.error || !membershipResult.data) {
      return { ok: false, error: "No tienes acceso a esa sucursal." }
    }
  }

  const heroImageUrl = String(formData.get("heroImageUrl") ?? "").trim()

  if (heroImageUrl) {
    try {
      const parsedUrl = new URL(heroImageUrl)

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return { ok: false, error: "La imagen hero de la sucursal debe usar una URL http o https valida." }
      }
    } catch {
      return { ok: false, error: "La imagen hero de la sucursal debe usar una URL valida." }
    }
  }

  const updateResult = await adminClient
    .from("branches")
    .update({
      hero_image_url: heroImageUrl || null,
    })
    .eq("id", branchId)
    .eq("tenant_id", access.membership.tenantId)
    .select("id")
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (updateResult.error || !updateResult.data) {
    return { ok: false, error: updateResult.error?.message ?? "No pudimos guardar el hero de la sucursal." }
  }

  const currentHeroPath = getCatalogMediaPathFromUrl(branchResult.data.hero_image_url)
  const nextHeroPath = getCatalogMediaPathFromUrl(heroImageUrl)

  if (currentHeroPath && currentHeroPath !== nextHeroPath) {
    await adminClient.storage.from(getCatalogMediaBucket()).remove([currentHeroPath])
  }

  revalidateBranchStorefrontPaths(tenantSlug)

  return { ok: true }
}
