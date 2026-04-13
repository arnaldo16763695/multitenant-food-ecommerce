import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  BusinessSignupStatus,
  BusinessSignupSummary,
  CreateBusinessSignupInput,
  PlatformTenantSummary,
} from "@/lib/domain/platform-admin"

type TenantRow = {
  id: string
  name: string
  slug: string
  storefront_enabled: boolean
}

type BranchCountRow = {
  tenant_id: string
}

type MembershipCountRow = {
  tenant_id: string
}

type BusinessSignupRow = {
  id: string
  company_name: string
  owner_full_name: string
  owner_email: string
  owner_phone: string | null
  slug_requested: string
  business_type: string | null
  branch_count_estimate: number | null
  status: BusinessSignupStatus
  created_at: string
  provisioned_tenant_id: string | null
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
}

export async function getPlatformTenants(supabase: SupabaseClient): Promise<readonly PlatformTenantSummary[]> {
  const [tenantsResult, branchesResult, membershipsResult] = await Promise.all([
    supabase.from("tenants").select("id, name, slug, storefront_enabled").order("name", { ascending: true }).returns<TenantRow[]>(),
    supabase.from("branches").select("tenant_id").eq("is_active", true).returns<BranchCountRow[]>(),
    supabase.from("tenant_memberships").select("tenant_id").eq("is_active", true).returns<MembershipCountRow[]>(),
  ])

  if (tenantsResult.error || branchesResult.error || membershipsResult.error) {
    throw new Error(tenantsResult.error?.message ?? branchesResult.error?.message ?? membershipsResult.error?.message ?? "No pudimos cargar tenants.")
  }

  const activeBranchCountMap = (branchesResult.data ?? []).reduce<Map<string, number>>((map, branch) => {
    map.set(branch.tenant_id, (map.get(branch.tenant_id) ?? 0) + 1)
    return map
  }, new Map())

  const activeMembershipCountMap = (membershipsResult.data ?? []).reduce<Map<string, number>>((map, membership) => {
    map.set(membership.tenant_id, (map.get(membership.tenant_id) ?? 0) + 1)
    return map
  }, new Map())

  return (tenantsResult.data ?? []).map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    storefrontEnabled: tenant.storefront_enabled,
    activeBranchCount: activeBranchCountMap.get(tenant.id) ?? 0,
    activeMembershipCount: activeMembershipCountMap.get(tenant.id) ?? 0,
  }))
}

export async function getBusinessSignups(supabase: SupabaseClient): Promise<readonly BusinessSignupSummary[]> {
  const signupsResult = await supabase
    .from("business_signups")
    .select("id, company_name, owner_full_name, owner_email, owner_phone, slug_requested, business_type, branch_count_estimate, status, created_at, provisioned_tenant_id")
    .order("created_at", { ascending: false })
    .returns<BusinessSignupRow[]>()

  if (signupsResult.error) {
    throw new Error(signupsResult.error.message)
  }

  return (signupsResult.data ?? []).map((signup) => ({
    id: signup.id,
    companyName: signup.company_name,
    ownerFullName: signup.owner_full_name,
    ownerEmail: signup.owner_email,
    ownerPhone: signup.owner_phone,
    slugRequested: signup.slug_requested,
    businessType: signup.business_type,
    branchCountEstimate: signup.branch_count_estimate,
    status: signup.status,
    createdAt: signup.created_at,
    provisionedTenantId: signup.provisioned_tenant_id,
  }))
}

export async function createBusinessSignup(
  supabase: SupabaseClient,
  input: CreateBusinessSignupInput
): Promise<{ ok: boolean; error?: string }> {
  const companyName = input.companyName.trim()
  const ownerFullName = input.ownerFullName.trim()
  const ownerEmail = input.ownerEmail.trim().toLowerCase()
  const slugRequested = normalizeSlug(input.slugRequested || input.companyName)

  if (!companyName || !ownerFullName || !ownerEmail || !slugRequested) {
    return { ok: false, error: "Completa empresa, responsable, email y slug solicitado." }
  }

  const existingSignupResult = await supabase
    .from("business_signups")
    .select("id")
    .or(`owner_email.eq.${ownerEmail},slug_requested.eq.${slugRequested}`)
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (existingSignupResult.error) {
    return { ok: false, error: existingSignupResult.error.message }
  }

  if (existingSignupResult.data) {
    return { ok: false, error: "Ya existe una solicitud con ese email o slug." }
  }

  const existingTenantResult = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slugRequested)
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (existingTenantResult.error) {
    return { ok: false, error: existingTenantResult.error.message }
  }

  if (existingTenantResult.data) {
    return { ok: false, error: "Ese slug ya esta en uso por otra empresa." }
  }

  const insertResult = await supabase.from("business_signups").insert({
    company_name: companyName,
    owner_full_name: ownerFullName,
    owner_email: ownerEmail,
    owner_phone: input.ownerPhone.trim() || null,
    slug_requested: slugRequested,
    business_type: input.businessType.trim() || null,
    branch_count_estimate: input.branchCountEstimate,
    notes: input.notes?.trim() || null,
    status: "pending",
  })

  if (insertResult.error) {
    return { ok: false, error: insertResult.error.message }
  }

  return { ok: true }
}
