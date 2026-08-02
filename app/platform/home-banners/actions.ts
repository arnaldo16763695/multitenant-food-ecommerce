"use server"

import { revalidatePath } from "next/cache"

import { requirePlatformAccess } from "@/lib/auth/platform"
import { buildAuditActor } from "@/lib/services/audit"
import { deletePlatformMobileHomeBanner, savePlatformMobileHomeBanner } from "@/lib/services/platform"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function savePlatformMobileHomeBannerAction(formData: FormData) {
  const access = await requirePlatformAccess("/platform/home-banners")
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const sortOrderRaw = String(formData.get("sortOrder") ?? "0").trim()
  const sortOrder = Number(sortOrderRaw)
  const result = await savePlatformMobileHomeBanner(adminClient, {
    bannerId: String(formData.get("bannerId") ?? "").trim() || undefined,
    tenantId: String(formData.get("tenantId") ?? "").trim(),
    branchId: String(formData.get("branchId") ?? "").trim() || null,
    title: String(formData.get("title") ?? ""),
    subtitle: String(formData.get("subtitle") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
    ctaLabel: String(formData.get("ctaLabel") ?? ""),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive: String(formData.get("isActive") ?? "false") === "true",
    startsAt: String(formData.get("startsAt") ?? "").trim() || null,
    endsAt: String(formData.get("endsAt") ?? "").trim() || null,
    auditActor: buildAuditActor({
      surface: "platform",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    }),
  })

  if (result.ok) {
    revalidatePath("/platform/home-banners")
  }

  return result
}

export async function deletePlatformMobileHomeBannerAction(bannerId: string) {
  const access = await requirePlatformAccess("/platform/home-banners")
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const result = await deletePlatformMobileHomeBanner(
    adminClient,
    bannerId,
    buildAuditActor({
      surface: "platform",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidatePath("/platform/home-banners")
  }

  return result
}
