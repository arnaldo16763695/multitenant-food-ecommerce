import type { SupabaseClient } from "@supabase/supabase-js"

import { slugifyCatalogValue } from "@/lib/domain/catalog"

type TenantOnboardingRow = {
  id: string
  name: string
  slug: string
  onboarding_completed_at: string | null
}

type BranchRow = {
  id: string
  name: string
  slug: string
}

export type TenantOnboardingState = {
  readonly tenantId: string
  readonly tenantName: string
  readonly tenantSlug: string
  readonly onboardingCompletedAt: string | null
  readonly primaryBranchId: string | null
  readonly primaryBranchName: string | null
}

export async function getTenantOnboardingStateBySlug(
  supabase: SupabaseClient,
  tenantSlug: string
): Promise<TenantOnboardingState | null> {
  const tenantResult = await supabase
    .from("tenants")
    .select("id, name, slug, onboarding_completed_at")
    .eq("slug", tenantSlug)
    .limit(1)
    .maybeSingle<TenantOnboardingRow>()

  if (tenantResult.error || !tenantResult.data) {
    return null
  }

  const branchesResult = await supabase
    .from("branches")
    .select("id, name, slug")
    .eq("tenant_id", tenantResult.data.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .returns<BranchRow[]>()

  const primaryBranch = (branchesResult.data ?? [])[0] ?? null

  return {
    tenantId: tenantResult.data.id,
    tenantName: tenantResult.data.name,
    tenantSlug: tenantResult.data.slug,
    onboardingCompletedAt: tenantResult.data.onboarding_completed_at,
    primaryBranchId: primaryBranch?.id ?? null,
    primaryBranchName: primaryBranch?.name ?? null,
  }
}

export async function completeTenantOnboarding(
  supabase: SupabaseClient,
  input: {
    readonly tenantId: string
    readonly profileId: string
    readonly businessName: string
    readonly primaryBranchId: string
    readonly primaryBranchName: string
  }
): Promise<{ ok: boolean; tenantSlug?: string; error?: string }> {
  const businessName = input.businessName.trim()
  const primaryBranchName = input.primaryBranchName.trim()

  if (!businessName) {
    return { ok: false, error: "Completa el nombre del negocio." }
  }

  if (!primaryBranchName) {
    return { ok: false, error: "Completa el nombre de la sucursal principal." }
  }

  const branchSlug = slugifyCatalogValue(primaryBranchName) || "principal"

  const branchCollisionResult = await supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("slug", branchSlug)
    .neq("id", input.primaryBranchId)
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (branchCollisionResult.error) {
    return { ok: false, error: branchCollisionResult.error.message }
  }

  if (branchCollisionResult.data) {
    return { ok: false, error: "Ya existe otra sucursal con ese slug dentro del tenant." }
  }

  const tenantUpdateResult = await supabase
    .from("tenants")
    .update({
      name: businessName,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_completed_by_profile_id: input.profileId,
    })
    .eq("id", input.tenantId)

  if (tenantUpdateResult.error) {
    return { ok: false, error: tenantUpdateResult.error.message }
  }

  const branchUpdateResult = await supabase
    .from("branches")
    .update({
      name: primaryBranchName,
      slug: branchSlug,
    })
    .eq("id", input.primaryBranchId)
    .eq("tenant_id", input.tenantId)

  if (branchUpdateResult.error) {
    return { ok: false, error: branchUpdateResult.error.message }
  }

  const tenantSlugResult = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", input.tenantId)
    .limit(1)
    .maybeSingle<{ slug: string }>()

  if (tenantSlugResult.error || !tenantSlugResult.data) {
    return { ok: false, error: tenantSlugResult.error?.message ?? "No pudimos obtener el slug del tenant." }
  }

  return {
    ok: true,
    tenantSlug: tenantSlugResult.data.slug,
  }
}
