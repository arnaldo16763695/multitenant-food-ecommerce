import { randomUUID } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import { buildAdminAuthCallbackUrl, buildAdminSetupPasswordUrl } from "@/lib/auth/admin-access"
import { sendBusinessOwnerProvisioningEmail } from "@/lib/email/business-owner-provisioning"
import { slugifyCatalogValue } from "@/lib/domain/catalog"

import type {
  BusinessSignupDecision,
  RegenerateBusinessSignupAccessResult,
  ProvisionBusinessSignupInput,
  ProvisionBusinessSignupResult,
  BusinessSignupStatus,
  BusinessSignupSummary,
  CreateBusinessSignupInput,
  PlatformTenantSummary,
  UpdateBusinessSignupDecisionInput,
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
  reviewed_at: string | null
  provisioned_tenant_id: string | null
  tenants: {
    slug: string
  } | null
}

type ExistingProfileRow = {
  id: string
  auth_user_id: string
  email: string | null
  full_name: string | null
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function buildTemporaryPassword() {
  return `${randomUUID()}Aa1!`
}

async function generateBusinessOwnerAccessLink(
  adminClient: SupabaseClient,
  tenantSlug: string,
  email: string,
  fullName: string,
  existingProfile?: ExistingProfileRow
) {
  const nextPath = `/app/${tenantSlug}/admin`
  const redirectTo = buildAdminSetupPasswordUrl(nextPath)

  if (existingProfile) {
    const linkResult = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: buildAdminAuthCallbackUrl(nextPath),
      },
    })

    if (linkResult.error || !linkResult.data?.properties?.action_link) {
      return {
        ok: false as const,
        error: linkResult.error?.message ?? "No pudimos generar el acceso del owner.",
      }
    }

    return {
      ok: true as const,
      authUserId: existingProfile.auth_user_id,
      invitationUrl: linkResult.data.properties.action_link,
    }
  }

  const createUserResult = await adminClient.auth.admin.createUser({
    email,
    password: buildTemporaryPassword(),
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (createUserResult.error || !createUserResult.data.user?.id) {
    return {
      ok: false as const,
      error: createUserResult.error?.message ?? "No pudimos crear la cuenta del owner.",
    }
  }

  const linkResult = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo,
    },
  })

  if (linkResult.error || !linkResult.data?.properties?.action_link) {
    return {
      ok: false as const,
      error: linkResult.error?.message ?? "No pudimos generar el enlace para definir la contrasena.",
    }
  }

  return {
    ok: true as const,
    authUserId: createUserResult.data.user.id,
    invitationUrl: linkResult.data.properties.action_link,
  }
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
    .select("id, company_name, owner_full_name, owner_email, owner_phone, slug_requested, business_type, branch_count_estimate, status, created_at, reviewed_at, provisioned_tenant_id, tenants:provisioned_tenant_id(slug)")
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
    reviewedAt: signup.reviewed_at,
    provisionedTenantId: signup.provisioned_tenant_id,
    provisionedTenantSlug: signup.tenants?.slug ?? null,
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

export async function updateBusinessSignupDecision(
  supabase: SupabaseClient,
  input: UpdateBusinessSignupDecisionInput
): Promise<{ ok: boolean; error?: string }> {
  const currentSignupResult = await supabase
    .from("business_signups")
    .select("id, status, provisioned_tenant_id")
    .eq("id", input.signupId)
    .limit(1)
    .maybeSingle<{ id: string; status: BusinessSignupStatus; provisioned_tenant_id: string | null }>()

  if (currentSignupResult.error || !currentSignupResult.data) {
    return { ok: false, error: "No encontramos la solicitud." }
  }

  if (currentSignupResult.data.status === input.decision) {
    return { ok: true }
  }

  if (currentSignupResult.data.status === "provisioned") {
    return { ok: false, error: "La solicitud ya fue provisionada y no puede volver a este estado." }
  }

  if (currentSignupResult.data.provisioned_tenant_id) {
    return { ok: false, error: "La solicitud ya esta asociada a un tenant provisionado." }
  }

  if (currentSignupResult.data.status !== "pending") {
    return { ok: false, error: "Solo las solicitudes pendientes pueden aprobarse o rechazarse." }
  }

  const nextStatus: BusinessSignupDecision = input.decision
  const updateResult = await supabase
    .from("business_signups")
    .update({
      status: nextStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by_profile_id: input.reviewedByProfileId,
    })
    .eq("id", input.signupId)
    .eq("status", "pending")

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
  }

  return { ok: true }
}

export async function provisionBusinessSignup(
  supabase: SupabaseClient,
  input: ProvisionBusinessSignupInput
): Promise<ProvisionBusinessSignupResult> {
  let createdTenantId: string | null = null

  const signupResult = await supabase
    .from("business_signups")
    .select("id, company_name, owner_full_name, owner_email, slug_requested, status, provisioned_tenant_id")
    .eq("id", input.signupId)
    .limit(1)
    .maybeSingle<{
      id: string
      company_name: string
      owner_full_name: string
      owner_email: string
      slug_requested: string
      status: BusinessSignupStatus
      provisioned_tenant_id: string | null
    }>()

  if (signupResult.error || !signupResult.data) {
    return { ok: false, error: "No encontramos la solicitud." }
  }

  if (signupResult.data.provisioned_tenant_id || signupResult.data.status === "provisioned") {
    return { ok: false, error: "La solicitud ya fue provisionada." }
  }

  if (signupResult.data.status !== "approved") {
    return { ok: false, error: "Solo las solicitudes aprobadas pueden provisionarse." }
  }

  const tenantSlug = normalizeSlug(signupResult.data.slug_requested || signupResult.data.company_name)
  const ownerEmail = normalizeEmail(signupResult.data.owner_email)
  const ownerFullName = signupResult.data.owner_full_name.trim()
  const companyName = signupResult.data.company_name.trim()

  const existingTenantResult = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (existingTenantResult.error) {
    return { ok: false, error: existingTenantResult.error.message }
  }

  if (existingTenantResult.data) {
    return { ok: false, error: "Ya existe un tenant con ese slug." }
  }

  const existingProfileResult = await supabase
    .from("profiles")
    .select("id, auth_user_id, email, full_name")
    .ilike("email", ownerEmail)
    .limit(1)
    .maybeSingle<ExistingProfileRow>()

  if (existingProfileResult.error) {
    return { ok: false, error: existingProfileResult.error.message }
  }

  const accessLinkResult = await generateBusinessOwnerAccessLink(
    supabase,
    tenantSlug,
    ownerEmail,
    ownerFullName,
    existingProfileResult.data ?? undefined
  )

  if (!accessLinkResult.ok) {
    return { ok: false, error: accessLinkResult.error }
  }

  const profileResult = await supabase
    .from("profiles")
    .upsert(
      {
        auth_user_id: accessLinkResult.authUserId,
        email: ownerEmail,
        full_name: ownerFullName,
      },
      {
        onConflict: "auth_user_id",
      }
    )
    .select("id")
    .single<{ id: string }>()

  if (profileResult.error || !profileResult.data) {
    return { ok: false, error: profileResult.error?.message ?? "No pudimos preparar el perfil del owner." }
  }

  const tenantInsertResult = await supabase
    .from("tenants")
    .insert({
      name: companyName,
      slug: tenantSlug,
      status: "active",
      storefront_enabled: true,
    })
    .select("id")
    .single<{ id: string }>()

  if (tenantInsertResult.error || !tenantInsertResult.data) {
    return { ok: false, error: tenantInsertResult.error?.message ?? "No pudimos crear el tenant." }
  }

  createdTenantId = tenantInsertResult.data.id

  const branchInsertResult = await supabase
    .from("branches")
    .insert({
      tenant_id: tenantInsertResult.data.id,
      name: "Principal",
      slug: slugifyCatalogValue("Principal") || "principal",
      is_active: true,
    })
    .select("id")
    .single<{ id: string }>()

  if (branchInsertResult.error || !branchInsertResult.data) {
    if (createdTenantId) {
      await supabase.from("tenants").delete().eq("id", createdTenantId)
    }
    return { ok: false, error: branchInsertResult.error?.message ?? "No pudimos crear la sucursal principal." }
  }

  const membershipInsertResult = await supabase
    .from("tenant_memberships")
    .insert({
      tenant_id: tenantInsertResult.data.id,
      profile_id: profileResult.data.id,
      role: "owner",
      is_active: true,
    })
    .select("id")
    .single<{ id: string }>()

  if (membershipInsertResult.error || !membershipInsertResult.data) {
    if (createdTenantId) {
      await supabase.from("tenants").delete().eq("id", createdTenantId)
    }
    return { ok: false, error: membershipInsertResult.error?.message ?? "No pudimos crear la membership del owner." }
  }

  const branchMembershipResult = await supabase.from("branch_memberships").insert({
    branch_id: branchInsertResult.data.id,
    tenant_membership_id: membershipInsertResult.data.id,
    role: "owner",
    is_active: true,
  })

  if (branchMembershipResult.error) {
    if (createdTenantId) {
      await supabase.from("tenants").delete().eq("id", createdTenantId)
    }
    return { ok: false, error: branchMembershipResult.error.message }
  }

  const signupUpdateResult = await supabase
    .from("business_signups")
    .update({
      status: "provisioned",
      reviewed_at: new Date().toISOString(),
      reviewed_by_profile_id: input.provisionedByProfileId,
      provisioned_tenant_id: tenantInsertResult.data.id,
    })
    .eq("id", input.signupId)

  if (signupUpdateResult.error) {
    if (createdTenantId) {
      await supabase.from("tenants").delete().eq("id", createdTenantId)
    }
    return { ok: false, error: signupUpdateResult.error.message }
  }

  const emailResult = await sendBusinessOwnerProvisioningEmail({
    email: ownerEmail,
    fullName: ownerFullName,
    companyName,
    adminUrl: accessLinkResult.invitationUrl,
  })

  return {
    ok: true,
    tenantId: tenantInsertResult.data.id,
    tenantSlug,
    invitationUrl: accessLinkResult.invitationUrl,
    delivery: emailResult.deliveredBy,
  }
}

export async function regenerateBusinessSignupAccess(
  supabase: SupabaseClient,
  signupId: string
): Promise<RegenerateBusinessSignupAccessResult> {
  const signupResult = await supabase
    .from("business_signups")
    .select("id, company_name, owner_full_name, owner_email, status, provisioned_tenant_id, tenants:provisioned_tenant_id(slug)")
    .eq("id", signupId)
    .limit(1)
    .maybeSingle<{
      id: string
      company_name: string
      owner_full_name: string
      owner_email: string
      status: BusinessSignupStatus
      provisioned_tenant_id: string | null
      tenants: {
        slug: string
      } | null
    }>()

  if (signupResult.error || !signupResult.data) {
    return { ok: false, error: "No encontramos la solicitud." }
  }

  if (signupResult.data.status !== "provisioned" || !signupResult.data.provisioned_tenant_id || !signupResult.data.tenants?.slug) {
    return { ok: false, error: "Solo puedes generar acceso para solicitudes ya provisionadas." }
  }

  const ownerEmail = normalizeEmail(signupResult.data.owner_email)
  const ownerFullName = signupResult.data.owner_full_name.trim()

  const existingProfileResult = await supabase
    .from("profiles")
    .select("id, auth_user_id, email, full_name")
    .ilike("email", ownerEmail)
    .limit(1)
    .maybeSingle<ExistingProfileRow>()

  if (existingProfileResult.error || !existingProfileResult.data) {
    return { ok: false, error: existingProfileResult.error?.message ?? "No encontramos el perfil del owner provisionado." }
  }

  const accessLinkResult = await generateBusinessOwnerAccessLink(
    supabase,
    signupResult.data.tenants.slug,
    ownerEmail,
    ownerFullName,
    existingProfileResult.data
  )

  if (!accessLinkResult.ok) {
    return { ok: false, error: accessLinkResult.error }
  }

  return {
    ok: true,
    tenantSlug: signupResult.data.tenants.slug,
    invitationUrl: accessLinkResult.invitationUrl,
  }
}
