"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import { canManageCatalogMaster } from "@/lib/auth/permissions"
import { buildAuditActor, writeAuditEvent } from "@/lib/services/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getCatalogMediaBucket, getCatalogMediaPathFromUrl } from "@/lib/supabase/storage"

type UpdateStorefrontBrandingResult = {
  readonly ok: boolean
  readonly error?: string
}

function revalidateSettingsPaths(tenantSlug: string) {
  revalidatePath(`/`)
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
    .select("hero_image_url, logo_image_url, storefront_enabled, mobile_payment_instructions, bank_transfer_instructions")
    .eq("id", access.membership.tenantId)
    .limit(1)
    .maybeSingle<{
      hero_image_url: string | null
      logo_image_url: string | null
      storefront_enabled: boolean
      mobile_payment_instructions: string | null
      bank_transfer_instructions: string | null
    }>()

  if (currentTenantResult.error || !currentTenantResult.data) {
    return { ok: false, error: currentTenantResult.error?.message ?? "No pudimos cargar el hero actual del storefront." }
  }

  const storefrontEnabled = String(formData.get("storefrontEnabled") ?? "true") === "true"
  const heroImageUrl = String(formData.get("heroImageUrl") ?? "").trim()
  const logoImageUrl = String(formData.get("logoImageUrl") ?? "").trim()
  const mobilePaymentInstructions = String(formData.get("mobilePaymentInstructions") ?? "").trim()
  const bankTransferInstructions = String(formData.get("bankTransferInstructions") ?? "").trim()

  const updateResult = await supabase
    .from("tenants")
    .update({
      storefront_enabled: storefrontEnabled,
      hero_image_url: heroImageUrl || null,
      logo_image_url: logoImageUrl || null,
      mobile_payment_instructions: mobilePaymentInstructions || null,
      bank_transfer_instructions: bankTransferInstructions || null,
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
  const currentLogoPath = getCatalogMediaPathFromUrl(currentTenantResult.data.logo_image_url)
  const nextLogoPath = getCatalogMediaPathFromUrl(logoImageUrl)

  const stalePaths = [currentHeroPath, currentLogoPath].filter((path): path is string => Boolean(path))
    .filter((path) => path !== nextHeroPath && path !== nextLogoPath)

  if (stalePaths.length) {
    const adminClient = createSupabaseAdminClient()

    if (adminClient) {
      await adminClient.storage.from(getCatalogMediaBucket()).remove(stalePaths)
    }
  }

  await writeAuditEvent(supabase, {
    tenantId: access.membership.tenantId,
    actor: buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    }),
    entityType: "tenant_settings",
    entityId: access.membership.tenantId,
    action: "tenant.storefront_settings_updated",
    summary: "Se actualizó la configuración storefront del tenant.",
    beforeData: {
      storefrontEnabled: currentTenantResult.data.storefront_enabled,
      heroImageUrl: currentTenantResult.data.hero_image_url,
      logoImageUrl: currentTenantResult.data.logo_image_url,
      mobilePaymentInstructions: currentTenantResult.data.mobile_payment_instructions,
      bankTransferInstructions: currentTenantResult.data.bank_transfer_instructions,
    },
    afterData: {
      storefrontEnabled,
      heroImageUrl: heroImageUrl || null,
      logoImageUrl: logoImageUrl || null,
      mobilePaymentInstructions: mobilePaymentInstructions || null,
      bankTransferInstructions: bankTransferInstructions || null,
    },
    metadata: {
      tenantSlug,
    },
  })

  revalidateSettingsPaths(tenantSlug)

  return { ok: true }
}
