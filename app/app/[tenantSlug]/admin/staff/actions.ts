"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import { MANAGEABLE_STAFF_ROLES, type ManageableStaffRole } from "@/lib/domain/staff"
import { canManageStaff, createStaffMember, setStaffMemberActiveState, updateStaffMember } from "@/lib/services/staff"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

function assertManageStaffAccess(role: string) {
  if (!canManageStaff(role)) {
    throw new Error("You do not have permission to manage staff for this tenant.")
  }
}

function revalidateStaffPaths(tenantSlug: string) {
  revalidatePath(`/app/${tenantSlug}/admin/staff`)
  revalidatePath(`/app/${tenantSlug}/admin`)
  revalidatePath(`/app/${tenantSlug}/kitchen`)
}

function parseRole(value: FormDataEntryValue | null): ManageableStaffRole | null {
  const nextRole = String(value ?? "")

  return MANAGEABLE_STAFF_ROLES.includes(nextRole as ManageableStaffRole) ? (nextRole as ManageableStaffRole) : null
}

function parseBranchIds(formData: FormData) {
  return formData
    .getAll("branchIds")
    .map((value) => String(value))
    .filter(Boolean)
}

export async function createStaffMemberAction(tenantSlug: string, formData: FormData) {
  const access = await requireAdminAccess(tenantSlug)
  assertManageStaffAccess(access.membership.role)

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const role = parseRole(formData.get("role"))

  if (!role) {
    return { ok: false, error: "Selecciona un rol valido." } as const
  }

  const result = await createStaffMember(adminClient, access.membership.tenantId, tenantSlug, {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    role,
    branchIds: parseBranchIds(formData),
  })

  if (result.ok) {
    revalidateStaffPaths(tenantSlug)
  }

  return result
}

export async function updateStaffMemberAction(tenantSlug: string, membershipId: string, formData: FormData) {
  const access = await requireAdminAccess(tenantSlug)
  assertManageStaffAccess(access.membership.role)

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const role = parseRole(formData.get("role"))

  if (!role) {
    return { ok: false, error: "Selecciona un rol valido." } as const
  }

  const result = await updateStaffMember(adminClient, access.membership.tenantId, membershipId, {
    fullName: String(formData.get("fullName") ?? ""),
    role,
    branchIds: parseBranchIds(formData),
    isActive: String(formData.get("isActive") ?? "true") === "true",
  })

  if (result.ok) {
    revalidateStaffPaths(tenantSlug)
  }

  return result
}

export async function setStaffMemberActiveStateAction(tenantSlug: string, membershipId: string, nextIsActive: boolean) {
  const access = await requireAdminAccess(tenantSlug)
  assertManageStaffAccess(access.membership.role)

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const result = await setStaffMemberActiveState(adminClient, access.membership.tenantId, membershipId, nextIsActive)

  if (result.ok) {
    revalidateStaffPaths(tenantSlug)
  }

  return result
}
