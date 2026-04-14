"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import { canManageCatalogMaster } from "@/lib/auth/permissions"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getCatalogMediaBucket, getCatalogMediaPathFromUrl } from "@/lib/supabase/storage"

type UpdateStorefrontBrandingResult = {
  readonly ok: boolean
  readonly error?: string
}

function revalidateSettingsPaths(tenantSlug: string) {
  revalidatePath(`/app/${tenantSlug}`)
  revalidatePath(`/app/${tenantSlug}/admin`)
  revalidatePath(`/app/${tenantSlug}/admin/settings`)
  revalidatePath(`/brands`)
}

export async function updateStorefrontBrandingAction(tenantSlug: string, formData: FormData): Promise<UpdateStorefrontBrandingResult> {
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogMaster(access.membership.role)) {
    return { ok: false, error: "Solo owner y manager pueden editar el storefront de la marca." }
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    throw new Error("Supabase admin client is not configured.")
  }

  const currentTenantResult = await supabase
    .from("tenants")
    .select("hero_image_url")
    .eq("id", access.membership.tenantId)
    .limit(1)
    .maybeSingle<{
      hero_image_url: string | null
    }>()

  if (currentTenantResult.error || !currentTenantResult.data) {
    return { ok: false, error: currentTenantResult.error?.message ?? "No pudimos cargar el hero actual del storefront." }
  }

  const storefrontEnabled = String(formData.get("storefrontEnabled") ?? "true") === "true"
  const heroImageUrl = String(formData.get("heroImageUrl") ?? "").trim()

  if (heroImageUrl) {
    try {
      const parsedUrl = new URL(heroImageUrl)

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return { ok: false, error: "La imagen hero debe usar una URL http o https valida." }
      }
    } catch {
      return { ok: false, error: "La imagen hero debe usar una URL valida." }
    }
  }

  const updateResult = await supabase
    .from("tenants")
    .update({
      storefront_enabled: storefrontEnabled,
      hero_image_url: heroImageUrl || null,
    })
    .eq("id", access.membership.tenantId)
    .select("id")
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (updateResult.error || !updateResult.data) {
    return { ok: false, error: updateResult.error?.message ?? "No pudimos persistir la configuracion del storefront." }
  }

  const currentHeroPath = getCatalogMediaPathFromUrl(currentTenantResult.data.hero_image_url)
  const nextHeroPath = getCatalogMediaPathFromUrl(heroImageUrl)

  if (currentHeroPath && currentHeroPath !== nextHeroPath) {
    const adminClient = createSupabaseAdminClient()

    if (adminClient) {
      await adminClient.storage.from(getCatalogMediaBucket()).remove([currentHeroPath])
    }
  }

  revalidateSettingsPaths(tenantSlug)

  return { ok: true }
}
