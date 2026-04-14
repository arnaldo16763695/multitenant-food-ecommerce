"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import { completeTenantOnboarding, getTenantOnboardingStateBySlug } from "@/lib/services/tenant-onboarding"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function completeTenantOnboardingAction(tenantSlug: string, formData: FormData) {
  const access = await requireAdminAccess(tenantSlug)

  if (access.membership.role !== "owner") {
    return { ok: false, error: "Solo el owner puede completar el onboarding inicial." } as const
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const state = await getTenantOnboardingStateBySlug(adminClient, tenantSlug)

  if (!state || !state.primaryBranchId) {
    return { ok: false, error: "No encontramos la estructura inicial del tenant." } as const
  }

  const result = await completeTenantOnboarding(adminClient, {
    tenantId: state.tenantId,
    profileId: access.profile.id,
    businessName: String(formData.get("businessName") ?? ""),
    primaryBranchId: state.primaryBranchId,
    primaryBranchName: String(formData.get("primaryBranchName") ?? ""),
  })

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/admin/onboarding`)
    revalidatePath(`/app/${tenantSlug}/admin/overview`)
    revalidatePath(`/app/${tenantSlug}/admin/branches`)
    revalidatePath("/platform/tenants")
    revalidatePath("/platform/signups")
  }

  return result
}
