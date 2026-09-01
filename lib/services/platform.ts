import { randomUUID } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import { buildAdminAuthCallbackUrl, buildAdminSetupPasswordUrl } from "@/lib/auth/admin-access"
import { sendBusinessOwnerProvisioningEmail } from "@/lib/email/business-owner-provisioning"
import { slugifyCatalogValue } from "@/lib/domain/catalog"
import type { AuditActor } from "@/lib/services/audit"
import { writeAuditEvent } from "@/lib/services/audit"

import type {
  BusinessSignupDecision,
  RegenerateBusinessSignupAccessResult,
  ProvisionBusinessSignupInput,
  ProvisionBusinessSignupResult,
  BusinessSignupStatus,
  BusinessSignupSummary,
  CreateBusinessSignupInput,
  PlatformTenantSummary,
  PlatformMobileHomeBannerOption,
  PlatformMobileHomeBannerSummary,
  SavePlatformMobileHomeBannerInput,
  UpdateBusinessSignupDecisionInput,
} from "@/lib/domain/platform-admin"

type PlatformTenantSummaryRow = {
  id: string
  name: string
  slug: string
  storefront_enabled: boolean
  active_branch_count: number
  active_membership_count: number
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

type MobileHomeBannerRow = {
  id: string
  tenant_id: string
  branch_id: string | null
  title: string
  subtitle: string
  image_url: string | null
  cta_label: string
  sort_order: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  tenants: {
    name: string
    slug: string
  } | null
  branches: {
    name: string
  } | null
}

type MobileHomeBannerTenantRow = {
  id: string
  name: string
  slug: string
  storefront_enabled: boolean
}

type MobileHomeBannerBranchRow = {
  id: string
  tenant_id: string
  name: string
  is_active: boolean
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
      wasNewlyCreated: false,
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
    wasNewlyCreated: true,
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
  // get_platform_tenant_summaries aggregates active branch/membership counts per tenant in
  // Postgres (GROUP BY) instead of fetching every branch/membership row across the whole
  // platform and counting them in JS -- the response is bounded by tenant count, not by total
  // branches/staff platform-wide.
  const summariesResult = await supabase.rpc("get_platform_tenant_summaries", {})

  if (summariesResult.error) {
    throw new Error(summariesResult.error.message)
  }

  // The Supabase client here has no generated Database schema to type .rpc() calls against, so
  // its return type degenerates to `any` -- cast against the shape get_platform_tenant_summaries
  // actually declares (`returns table(...)`), the same manual-typing approach every other query
  // in this file already uses via .returns<T[]>().
  const summaries = (summariesResult.data ?? []) as readonly PlatformTenantSummaryRow[]

  return summaries.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    storefrontEnabled: tenant.storefront_enabled,
    activeBranchCount: Number(tenant.active_branch_count),
    activeMembershipCount: Number(tenant.active_membership_count),
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
  input: UpdateBusinessSignupDecisionInput & {
    readonly auditActor?: AuditActor
  }
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

  await writeAuditEvent(supabase, {
    actor: input.auditActor ?? { profileId: input.reviewedByProfileId, membershipId: null, name: null, role: null, surface: "platform" },
    entityType: "platform_signup",
    entityId: input.signupId,
    action: "platform.signup_decision_updated",
    summary: `Se marcó la solicitud como ${nextStatus}.`,
    beforeData: {
      status: currentSignupResult.data.status,
      provisionedTenantId: currentSignupResult.data.provisioned_tenant_id,
    },
    afterData: {
      status: nextStatus,
    },
    metadata: {
      signupId: input.signupId,
    },
  })

  return { ok: true }
}

export async function getPlatformMobileHomeBanners(supabase: SupabaseClient): Promise<readonly PlatformMobileHomeBannerSummary[]> {
  const bannersResult = await supabase
    .from("mobile_home_banners")
    .select("id, tenant_id, branch_id, title, subtitle, image_url, cta_label, sort_order, is_active, starts_at, ends_at, tenants(name, slug), branches(name)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<MobileHomeBannerRow[]>()

  if (bannersResult.error) {
    throw new Error(bannersResult.error.message)
  }

  return (bannersResult.data ?? []).map((banner) => ({
    id: banner.id,
    tenantId: banner.tenant_id,
    tenantName: banner.tenants?.name ?? "Tenant",
    tenantSlug: banner.tenants?.slug ?? "tenant",
    branchId: banner.branch_id,
    branchName: banner.branches?.name ?? null,
    title: banner.title,
    subtitle: banner.subtitle,
    imageUrl: banner.image_url,
    ctaLabel: banner.cta_label,
    sortOrder: banner.sort_order,
    isActive: banner.is_active,
    startsAt: banner.starts_at,
    endsAt: banner.ends_at,
  }))
}

export async function getPlatformMobileHomeBannerOptions(supabase: SupabaseClient): Promise<readonly PlatformMobileHomeBannerOption[]> {
  const [tenantsResult, branchesResult] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name, slug, storefront_enabled")
      .eq("storefront_enabled", true)
      .order("name", { ascending: true })
      .returns<MobileHomeBannerTenantRow[]>(),
    supabase
      .from("branches")
      .select("id, tenant_id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .returns<MobileHomeBannerBranchRow[]>(),
  ])

  if (tenantsResult.error || branchesResult.error) {
    throw new Error(tenantsResult.error?.message ?? branchesResult.error?.message ?? "No pudimos cargar opciones de banners mobile.")
  }

  const branchesByTenant = (branchesResult.data ?? []).reduce<Map<string, { id: string; name: string }[]>>((map, branch) => {
    const current = map.get(branch.tenant_id) ?? []
    map.set(branch.tenant_id, [...current, { id: branch.id, name: branch.name }])
    return map
  }, new Map())

  return (tenantsResult.data ?? []).map((tenant) => ({
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    branches: branchesByTenant.get(tenant.id) ?? [],
  }))
}

export async function savePlatformMobileHomeBanner(
  supabase: SupabaseClient,
  input: SavePlatformMobileHomeBannerInput & { readonly auditActor?: AuditActor }
): Promise<{ ok: boolean; error?: string; bannerId?: string }> {
  const title = input.title.trim()
  const subtitle = input.subtitle.trim()
  const ctaLabel = input.ctaLabel.trim() || "Abrir tienda"
  const imageUrl = input.imageUrl?.trim() || null
  const startsAt = input.startsAt?.trim() || null
  const endsAt = input.endsAt?.trim() || null
  const branchId = input.branchId?.trim() || null

  if (!input.tenantId.trim() || !title) {
    return { ok: false, error: "Selecciona un tenant y escribe un titulo para continuar." }
  }

  if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    return { ok: false, error: "La fecha de inicio no puede ser mayor que la fecha de fin." }
  }

  const tenantResult = await supabase
    .from("tenants")
    .select("id, slug, storefront_enabled")
    .eq("id", input.tenantId)
    .limit(1)
    .maybeSingle<{ id: string; slug: string; storefront_enabled: boolean }>()

  if (tenantResult.error || !tenantResult.data || !tenantResult.data.storefront_enabled) {
    return { ok: false, error: "Selecciona un tenant con storefront publicado." }
  }

  if (imageUrl) {
    try {
      const parsedUrl = new URL(imageUrl)

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return { ok: false, error: "La imagen del banner debe usar una URL http o https valida." }
      }
    } catch {
      return { ok: false, error: "La imagen del banner debe usar una URL valida." }
    }
  }

  if (branchId) {
    const branchResult = await supabase
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("tenant_id", input.tenantId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle<{ id: string }>()

    if (branchResult.error || !branchResult.data) {
      return { ok: false, error: "La sucursal seleccionada no pertenece al tenant o no esta activa." }
    }
  }

  const bannerId = input.bannerId?.trim() || randomUUID()
  const beforeResult = input.bannerId
    ? await supabase
        .from("mobile_home_banners")
        .select("id, tenant_id, branch_id, title, subtitle, image_url, cta_label, sort_order, is_active, starts_at, ends_at")
        .eq("id", bannerId)
        .limit(1)
        .maybeSingle<Record<string, unknown>>()
    : { data: null, error: null }

  if (beforeResult.error) {
    return { ok: false, error: beforeResult.error.message }
  }

  const upsertResult = await supabase
    .from("mobile_home_banners")
    .upsert(
      {
        id: bannerId,
        tenant_id: input.tenantId,
        branch_id: branchId,
        title,
        subtitle,
        image_url: imageUrl,
        cta_label: ctaLabel,
        sort_order: input.sortOrder,
        is_active: input.isActive,
        starts_at: startsAt,
        ends_at: endsAt,
      },
      { onConflict: "id" }
    )
    .select("id")
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (upsertResult.error || !upsertResult.data) {
    return { ok: false, error: upsertResult.error?.message ?? "No pudimos guardar el banner mobile." }
  }

  if (input.auditActor) {
    await writeAuditEvent(supabase, {
      actor: input.auditActor,
      entityType: "mobile_home_banner",
      entityId: bannerId,
      action: input.bannerId ? "updated" : "created",
      summary: input.bannerId ? `Actualizo banner mobile ${title}.` : `Creo banner mobile ${title}.`,
      beforeData: beforeResult.data,
      afterData: {
        tenantId: input.tenantId,
        branchId,
        title,
        subtitle,
        imageUrl,
        ctaLabel,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        startsAt,
        endsAt,
      },
      metadata: {
        tenantSlug: tenantResult.data.slug,
      },
    })
  }

  return { ok: true, bannerId }
}

export async function deletePlatformMobileHomeBanner(
  supabase: SupabaseClient,
  bannerId: string,
  auditActor?: AuditActor
): Promise<{ ok: boolean; error?: string }> {
  const bannerResult = await supabase
    .from("mobile_home_banners")
    .select("id, tenant_id, branch_id, title, subtitle, image_url, cta_label, sort_order, is_active, starts_at, ends_at")
    .eq("id", bannerId)
    .limit(1)
    .maybeSingle<Record<string, unknown>>()

  if (bannerResult.error || !bannerResult.data) {
    return { ok: false, error: bannerResult.error?.message ?? "No encontramos el banner mobile indicado." }
  }

  const deleteResult = await supabase.from("mobile_home_banners").delete().eq("id", bannerId)

  if (deleteResult.error) {
    return { ok: false, error: deleteResult.error.message }
  }

  if (auditActor) {
    await writeAuditEvent(supabase, {
      actor: auditActor,
      entityType: "mobile_home_banner",
      entityId: bannerId,
      action: "deleted",
      summary: `Elimino banner mobile ${(bannerResult.data.title as string | undefined) ?? bannerId}.`,
      beforeData: bannerResult.data,
      afterData: null,
    })
  }

  return { ok: true }
}

export async function provisionBusinessSignup(
  supabase: SupabaseClient,
  input: ProvisionBusinessSignupInput & {
    readonly auditActor?: AuditActor
  }
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
    // If we just created this auth user (brand-new owner email) and the profile row that should
    // be linked to it never got committed, that user is an orphan: the "already provisioned"
    // check below is keyed off the profiles table, so a retry would call auth.admin.createUser
    // again with the same email and fail permanently on a duplicate-email error. Reusing a
    // pre-existing profile's auth user is never deleted here.
    if (accessLinkResult.wasNewlyCreated) {
      await supabase.auth.admin.deleteUser(accessLinkResult.authUserId)
    }

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

  await writeAuditEvent(supabase, {
    actor: input.auditActor ?? { profileId: input.provisionedByProfileId, membershipId: null, name: null, role: null, surface: "platform" },
    entityType: "platform_signup",
    entityId: input.signupId,
    action: "platform.signup_provisioned",
    summary: `Se provisionó el tenant ${tenantSlug} desde la solicitud aprobada.`,
    beforeData: {
      signupId: input.signupId,
      tenantId: null,
    },
    afterData: {
      tenantId: tenantInsertResult.data.id,
      tenantSlug,
      ownerEmail,
      companyName,
    },
    metadata: {
      signupId: input.signupId,
      tenantId: tenantInsertResult.data.id,
      tenantSlug,
      delivery: emailResult.deliveredBy,
    },
  })

  await writeAuditEvent(supabase, {
    actor: input.auditActor ?? { profileId: input.provisionedByProfileId, membershipId: null, name: null, role: null, surface: "platform" },
    entityType: "platform_tenant",
    entityId: tenantInsertResult.data.id,
    action: "platform.tenant_created",
    summary: `Se creó el tenant ${tenantSlug} desde platform.`,
    afterData: {
      tenantId: tenantInsertResult.data.id,
      tenantSlug,
      companyName,
      ownerEmail,
      primaryBranchId: branchInsertResult.data.id,
      ownerMembershipId: membershipInsertResult.data.id,
    },
    metadata: {
      signupId: input.signupId,
      delivery: emailResult.deliveredBy,
    },
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
  signupId: string,
  auditActor?: AuditActor
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

  await writeAuditEvent(supabase, {
    actor: auditActor ?? { profileId: null, membershipId: null, name: null, role: null, surface: "platform" },
    entityType: "platform_signup",
    entityId: signupId,
    action: "platform.signup_access_regenerated",
    summary: `Se regeneró el acceso del owner para ${signupResult.data.tenants.slug}.`,
    afterData: {
      tenantSlug: signupResult.data.tenants.slug,
    },
    metadata: {
      signupId,
      provisionedTenantId: signupResult.data.provisioned_tenant_id,
    },
  })

  return {
    ok: true,
    tenantSlug: signupResult.data.tenants.slug,
    invitationUrl: accessLinkResult.invitationUrl,
  }
}
