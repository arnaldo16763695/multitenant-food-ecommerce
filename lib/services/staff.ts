import { randomUUID } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  AdminStaffMember,
  ManageableStaffRole,
  StaffBranchOption,
  StaffMutationResult,
  StaffRole,
} from "@/lib/domain/staff"
import { isManageableStaffRole } from "@/lib/domain/staff"
import { sendStaffInvitationEmail } from "@/lib/email/staff-invitations"

type BranchRow = {
  id: string
  name: string
  is_active: boolean
}

type MembershipRow = {
  id: string
  profile_id: string
  role: StaffRole
  is_active: boolean
  profiles: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

type BranchMembershipRow = {
  tenant_membership_id: string
  branch_id: string
  role: StaffRole
  is_active: boolean
  branches: {
    id: string
    name: string
  } | null
}

type ExistingProfileRow = {
  id: string
  auth_user_id: string
  email: string | null
  full_name: string | null
}

type MembershipIdentityRow = {
  id: string
  role: StaffRole
  is_active: boolean
}

function getAppUrl() {
  const explicitAppUrl = process.env.APP_URL?.trim()
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  const vercelPreviewUrl = process.env.VERCEL_URL?.trim()

  if (explicitAppUrl) {
    return explicitAppUrl
  }

  if (vercelProductionUrl) {
    return `https://${vercelProductionUrl}`
  }

  if (vercelPreviewUrl) {
    return `https://${vercelPreviewUrl}`
  }

  return "http://localhost:3000"
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function buildTemporaryPassword() {
  return `${randomUUID()}Aa1!`
}

export function canManageStaff(role: string) {
  return role === "owner" || role === "manager"
}

export async function getStaffBranches(supabase: SupabaseClient, tenantId: string): Promise<readonly StaffBranchOption[]> {
  const branchesResult = await supabase
    .from("branches")
    .select("id, name, is_active")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .returns<BranchRow[]>()

  if (branchesResult.error) {
    throw new Error(branchesResult.error.message)
  }

  return (branchesResult.data ?? []).map((branch) => ({
    id: branch.id,
    name: branch.name,
    isActive: branch.is_active,
  }))
}

export async function getActiveBranchIdsForMembership(
  supabase: SupabaseClient,
  membershipId: string
): Promise<readonly string[]> {
  const branchMembershipsResult = await supabase
    .from("branch_memberships")
    .select("branch_id")
    .eq("tenant_membership_id", membershipId)
    .eq("is_active", true)
    .returns<{ branch_id: string }[]>()

  if (branchMembershipsResult.error) {
    throw new Error(branchMembershipsResult.error.message)
  }

  return (branchMembershipsResult.data ?? []).map((assignment) => assignment.branch_id)
}

export async function getAdminStaffMembers(supabase: SupabaseClient, tenantId: string): Promise<readonly AdminStaffMember[]> {
  const membershipsResult = await supabase
    .from("tenant_memberships")
    .select("id, profile_id, role, is_active, profiles!inner(id, full_name, email)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .returns<MembershipRow[]>()

  if (membershipsResult.error) {
    throw new Error(membershipsResult.error.message)
  }

  const memberships = membershipsResult.data ?? []
  const membershipIds = memberships.map((membership) => membership.id)

  const branchMembershipsResult = membershipIds.length
    ? await supabase
        .from("branch_memberships")
        .select("tenant_membership_id, branch_id, role, is_active, branches!inner(id, name)")
        .in("tenant_membership_id", membershipIds)
        .returns<BranchMembershipRow[]>()
    : { data: [], error: null as null }

  if (branchMembershipsResult.error) {
    throw new Error(branchMembershipsResult.error.message)
  }

  const branchMemberships = branchMembershipsResult.data ?? []

  return memberships.map((membership) => ({
    membershipId: membership.id,
    profileId: membership.profile_id,
    fullName: membership.profiles?.full_name?.trim() || "Sin nombre",
    email: membership.profiles?.email?.trim() || "Sin email",
    role: membership.role,
    isActive: membership.is_active,
    branches: branchMemberships
      .filter((assignment) => assignment.tenant_membership_id === membership.id)
      .map((assignment) => ({
        membershipId: membership.id,
        branchId: assignment.branch_id,
        branchName: assignment.branches?.name ?? "Sucursal",
        isActive: assignment.is_active,
        role: assignment.role,
      }))
      .sort((left, right) => left.branchName.localeCompare(right.branchName)),
  }))
}

async function generateStaffAccessLink(
  adminClient: SupabaseClient,
  tenantSlug: string,
  email: string,
  fullName: string,
  existingProfile?: ExistingProfileRow
) {
  const redirectTo = `${getAppUrl()}/auth/admin/setup-password?next=${encodeURIComponent(`/app/${tenantSlug}/admin`)}`

  if (existingProfile) {
    const linkResult = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${getAppUrl()}/app/${tenantSlug}/admin`,
      },
    })

    if (linkResult.error || !linkResult.data?.properties?.action_link) {
      return {
        ok: false as const,
        error: linkResult.error?.message ?? "No pudimos generar el acceso para el miembro del staff.",
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
      error: createUserResult.error?.message ?? "No pudimos crear la cuenta del staff.",
    }
  }

  const linkResult = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo,
    },
  })

  if (linkResult.error || !linkResult.data.properties?.action_link) {
    return {
      ok: false as const,
      error: linkResult.error?.message ?? "No pudimos generar el enlace para definir la contraseña.",
    }
  }

  return {
    ok: true as const,
    authUserId: createUserResult.data.user.id,
    invitationUrl: linkResult.data.properties.action_link,
  }
}

export async function createStaffMember(
  adminClient: SupabaseClient,
  tenantId: string,
  tenantSlug: string,
  input: {
    readonly fullName: string
    readonly email: string
    readonly role: ManageableStaffRole
    readonly branchIds: readonly string[]
  }
): Promise<StaffMutationResult> {
  const normalizedEmail = normalizeEmail(input.email)
  const normalizedName = input.fullName.trim()
  const branchIds = [...new Set(input.branchIds)]

  if (!normalizedName) {
    return { ok: false, error: "Completa el nombre del miembro del staff." }
  }

  if (!normalizedEmail) {
    return { ok: false, error: "Completa el email del miembro del staff." }
  }

  if (!branchIds.length) {
    return { ok: false, error: "Selecciona al menos una sucursal." }
  }

  const existingProfileResult = await adminClient
    .from("profiles")
    .select("id, auth_user_id, email, full_name")
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle<ExistingProfileRow>()

  if (existingProfileResult.error) {
    return { ok: false, error: existingProfileResult.error.message }
  }

  const accessLinkResult = await generateStaffAccessLink(
    adminClient,
    tenantSlug,
    normalizedEmail,
    normalizedName,
    existingProfileResult.data ?? undefined
  )

  if (!accessLinkResult.ok) {
    return { ok: false, error: accessLinkResult.error }
  }

  const profileResult = await adminClient
    .from("profiles")
    .upsert(
      {
        auth_user_id: accessLinkResult.authUserId,
        email: normalizedEmail,
        full_name: normalizedName,
      },
      {
        onConflict: "auth_user_id",
      }
    )
    .select("id")
    .single<{ id: string }>()

  if (profileResult.error) {
    return { ok: false, error: profileResult.error.message }
  }

  const existingMembershipResult = await adminClient
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("profile_id", profileResult.data.id)
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (existingMembershipResult.error) {
    return { ok: false, error: existingMembershipResult.error.message }
  }

  if (existingMembershipResult.data) {
    return { ok: false, error: "Este usuario ya pertenece a este tenant." }
  }

  const membershipResult = await adminClient
    .from("tenant_memberships")
    .insert({
      tenant_id: tenantId,
      profile_id: profileResult.data.id,
      role: input.role,
      is_active: true,
    })
    .select("id")
    .single<{ id: string }>()

  if (membershipResult.error) {
    return { ok: false, error: membershipResult.error.message }
  }

  const branchMembershipRows = branchIds.map((branchId) => ({
    branch_id: branchId,
    tenant_membership_id: membershipResult.data.id,
    role: input.role,
    is_active: true,
  }))

  const branchMembershipsResult = await adminClient.from("branch_memberships").insert(branchMembershipRows)

  if (branchMembershipsResult.error) {
    return { ok: false, error: branchMembershipsResult.error.message }
  }

  const emailResult = await sendStaffInvitationEmail({
    email: normalizedEmail,
    fullName: normalizedName,
    tenantSlug,
    invitationUrl: accessLinkResult.invitationUrl,
  })

  return {
    ok: true,
    delivery: emailResult.deliveredBy,
  }
}

export async function updateStaffMember(
  adminClient: SupabaseClient,
  tenantId: string,
  membershipId: string,
  input: {
    readonly fullName: string
    readonly role: ManageableStaffRole
    readonly branchIds: readonly string[]
    readonly isActive: boolean
  }
): Promise<StaffMutationResult> {
  const normalizedName = input.fullName.trim()
  const branchIds = [...new Set(input.branchIds)]

  if (!normalizedName) {
    return { ok: false, error: "Completa el nombre del miembro del staff." }
  }

  if (!branchIds.length) {
    return { ok: false, error: "Selecciona al menos una sucursal." }
  }

  const membershipResult = await adminClient
    .from("tenant_memberships")
    .select("id, profile_id, role, is_active")
    .eq("id", membershipId)
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle<MembershipIdentityRow & { profile_id: string }>()

  if (membershipResult.error || !membershipResult.data) {
    return { ok: false, error: membershipResult.error?.message ?? "No encontramos el miembro del staff." }
  }

  if (!isManageableStaffRole(membershipResult.data.role)) {
    return { ok: false, error: "Este rol no se puede editar desde este modulo." }
  }

  const profileUpdateResult = await adminClient
    .from("profiles")
    .update({
      full_name: normalizedName,
    })
    .eq("id", membershipResult.data.profile_id)

  if (profileUpdateResult.error) {
    return { ok: false, error: profileUpdateResult.error.message }
  }

  const tenantMembershipUpdateResult = await adminClient
    .from("tenant_memberships")
    .update({
      role: input.role,
      is_active: input.isActive,
    })
    .eq("id", membershipId)

  if (tenantMembershipUpdateResult.error) {
    return { ok: false, error: tenantMembershipUpdateResult.error.message }
  }

  const existingAssignmentsResult = await adminClient
    .from("branch_memberships")
    .select("branch_id")
    .eq("tenant_membership_id", membershipId)
    .returns<{ branch_id: string }[]>()

  if (existingAssignmentsResult.error) {
    return { ok: false, error: existingAssignmentsResult.error.message }
  }

  const existingBranchIds = new Set((existingAssignmentsResult.data ?? []).map((assignment) => assignment.branch_id))
  const selectedBranchIds = new Set(branchIds)

  const branchesToUpsert = branchIds.map((branchId) => ({
    branch_id: branchId,
    tenant_membership_id: membershipId,
    role: input.role,
    is_active: input.isActive,
  }))

  const upsertResult = await adminClient.from("branch_memberships").upsert(branchesToUpsert, {
    onConflict: "branch_id,tenant_membership_id",
  })

  if (upsertResult.error) {
    return { ok: false, error: upsertResult.error.message }
  }

  const branchIdsToDeactivate = [...existingBranchIds].filter((branchId) => !selectedBranchIds.has(branchId))

  if (branchIdsToDeactivate.length) {
    const deactivateResult = await adminClient
      .from("branch_memberships")
      .update({
        is_active: false,
      })
      .eq("tenant_membership_id", membershipId)
      .in("branch_id", branchIdsToDeactivate)

    if (deactivateResult.error) {
      return { ok: false, error: deactivateResult.error.message }
    }
  }

  return {
    ok: true,
    delivery: "none",
  }
}

export async function setStaffMemberActiveState(
  adminClient: SupabaseClient,
  tenantId: string,
  membershipId: string,
  nextIsActive: boolean
): Promise<StaffMutationResult> {
  const membershipResult = await adminClient
    .from("tenant_memberships")
    .select("id, role")
    .eq("id", membershipId)
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle<MembershipIdentityRow>()

  if (membershipResult.error || !membershipResult.data) {
    return { ok: false, error: membershipResult.error?.message ?? "No encontramos el miembro del staff." }
  }

  if (!isManageableStaffRole(membershipResult.data.role)) {
    return { ok: false, error: "Este rol no se puede activar o desactivar desde este modulo." }
  }

  const tenantMembershipUpdateResult = await adminClient
    .from("tenant_memberships")
    .update({
      is_active: nextIsActive,
    })
    .eq("id", membershipId)

  if (tenantMembershipUpdateResult.error) {
    return { ok: false, error: tenantMembershipUpdateResult.error.message }
  }

  const branchMembershipUpdateResult = await adminClient
    .from("branch_memberships")
    .update({
      is_active: nextIsActive,
    })
    .eq("tenant_membership_id", membershipId)

  if (branchMembershipUpdateResult.error) {
    return { ok: false, error: branchMembershipUpdateResult.error.message }
  }

  return { ok: true, delivery: "none" }
}
