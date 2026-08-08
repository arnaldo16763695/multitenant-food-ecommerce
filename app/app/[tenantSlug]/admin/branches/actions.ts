"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import type { BranchScheduleMutationInput } from "@/lib/domain/branch-schedule"
import { updateBranchSchedule } from "@/lib/services/branch-schedule"
import { buildAuditActor, writeAuditEvent } from "@/lib/services/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getCatalogMediaBucket, getCatalogMediaPathFromUrl } from "@/lib/supabase/storage"

type UpdateBranchStorefrontHeroResult = {
  readonly ok: boolean
  readonly error?: string
}

type UpdateBranchScheduleResult = {
  readonly ok: boolean
  readonly error?: string
}

function parseOptionalCoordinate(value: FormDataEntryValue | null, label: string) {
  const normalizedValue = String(value ?? "").trim()

  if (!normalizedValue) {
    return { ok: true as const, value: null }
  }

  const parsedValue = Number(normalizedValue)

  if (!Number.isFinite(parsedValue)) {
    return { ok: false as const, error: `${label} debe ser un numero valido.` }
  }

  return { ok: true as const, value: parsedValue }
}

function getBranchLocationConstraintMessage(errorMessage: string) {
  if (errorMessage.includes("branches_coordinates_presence_check")) {
    return "La sucursal debe guardar latitud y longitud juntas."
  }

  if (errorMessage.includes("branches_latitude_range_check")) {
    return "La latitud debe estar entre -90 y 90."
  }

  if (errorMessage.includes("branches_longitude_range_check")) {
    return "La longitud debe estar entre -180 y 180."
  }

  return null
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
    .select("id, tenant_id, name, hero_image_url, address_line_1, city, state, postal_code, country_code, latitude, longitude")
    .eq("id", branchId)
    .limit(1)
    .maybeSingle<{
      id: string
      tenant_id: string
      name: string
      hero_image_url: string | null
      address_line_1: string | null
      city: string | null
      state: string | null
      postal_code: string | null
      country_code: string | null
      latitude: number | null
      longitude: number | null
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
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim()
  const city = String(formData.get("city") ?? "").trim()
  const state = String(formData.get("state") ?? "").trim()
  const postalCode = String(formData.get("postalCode") ?? "").trim()
  const countryCode = String(formData.get("countryCode") ?? "").trim().toUpperCase()
  const latitudeResult = parseOptionalCoordinate(formData.get("latitude"), "La latitud")
  const longitudeResult = parseOptionalCoordinate(formData.get("longitude"), "La longitud")

  if (!latitudeResult.ok) {
    return { ok: false, error: latitudeResult.error }
  }

  if (!longitudeResult.ok) {
    return { ok: false, error: longitudeResult.error }
  }

  if ((latitudeResult.value == null) !== (longitudeResult.value == null)) {
    return { ok: false, error: "La sucursal debe guardar latitud y longitud juntas." }
  }

  if (latitudeResult.value != null && (latitudeResult.value < -90 || latitudeResult.value > 90)) {
    return { ok: false, error: "La latitud debe estar entre -90 y 90." }
  }

  if (longitudeResult.value != null && (longitudeResult.value < -180 || longitudeResult.value > 180)) {
    return { ok: false, error: "La longitud debe estar entre -180 y 180." }
  }

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
      address_line_1: addressLine1 || null,
      city: city || null,
      state: state || null,
      postal_code: postalCode || null,
      country_code: countryCode || null,
      latitude: latitudeResult.value,
      longitude: longitudeResult.value,
    })
    .eq("id", branchId)
    .eq("tenant_id", access.membership.tenantId)
    .select("id")
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (updateResult.error || !updateResult.data) {
    return {
      ok: false,
      error:
        (updateResult.error?.message ? getBranchLocationConstraintMessage(updateResult.error.message) : null) ??
        updateResult.error?.message ??
        "No pudimos guardar la configuracion de la sucursal.",
    }
  }

  const currentHeroPath = getCatalogMediaPathFromUrl(branchResult.data.hero_image_url)
  const nextHeroPath = getCatalogMediaPathFromUrl(heroImageUrl)

  if (currentHeroPath && currentHeroPath !== nextHeroPath) {
    await adminClient.storage.from(getCatalogMediaBucket()).remove([currentHeroPath])
  }

  await writeAuditEvent(adminClient, {
    tenantId: access.membership.tenantId,
    branchId,
    actor: buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    }),
    entityType: "branch",
    entityId: branchId,
    action: "branch.storefront_updated",
    summary: `Se actualizó la configuración storefront de la sucursal ${branchResult.data.name}.`,
    beforeData: {
      heroImageUrl: branchResult.data.hero_image_url,
      addressLine1: branchResult.data.address_line_1,
      city: branchResult.data.city,
      state: branchResult.data.state,
      postalCode: branchResult.data.postal_code,
      countryCode: branchResult.data.country_code,
      latitude: branchResult.data.latitude,
      longitude: branchResult.data.longitude,
    },
    afterData: {
      heroImageUrl: heroImageUrl || null,
      addressLine1: addressLine1 || null,
      city: city || null,
      state: state || null,
      postalCode: postalCode || null,
      countryCode: countryCode || null,
      latitude: latitudeResult.value,
      longitude: longitudeResult.value,
    },
    metadata: {
      branchId,
      branchName: branchResult.data.name,
    },
  })

  revalidateBranchStorefrontPaths(tenantSlug)

  return { ok: true }
}

function parseBranchSchedulePayload(formData: FormData): BranchScheduleMutationInput | null {
  const rawSchedule = formData.get("schedule")

  if (typeof rawSchedule !== "string" || !rawSchedule.trim()) {
    return null
  }

  try {
    return JSON.parse(rawSchedule) as BranchScheduleMutationInput
  } catch {
    return null
  }
}

export async function updateBranchScheduleAction(
  tenantSlug: string,
  branchId: string,
  formData: FormData
): Promise<UpdateBranchScheduleResult> {
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageBranchStorefront(access.membership.role)) {
    return { ok: false, error: "No tienes permisos para editar el horario de esta sucursal." }
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
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

  const schedulePayload = parseBranchSchedulePayload(formData)

  if (!schedulePayload) {
    return { ok: false, error: "No pudimos leer la configuración de horario enviada." }
  }

  const result = await updateBranchSchedule(
    adminClient,
    access.membership.tenantId,
    branchId,
    schedulePayload,
    buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidateBranchStorefrontPaths(tenantSlug)
  }

  return result
}
