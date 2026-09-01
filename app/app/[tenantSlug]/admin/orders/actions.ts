"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import { canAccessAdminSection } from "@/lib/auth/permissions"
import type { OrderStatus, PaymentStatus } from "@/lib/domain/order"
import { buildAuditActor } from "@/lib/services/audit"
import { releaseAdminOrderAssignment, rejectManualPayment, updateAdminOrderPaymentStatus, updateAdminOrderStatus } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

// requireAdminAccess only proves an active membership in this tenant, not that the role can
// touch orders -- preparer (kitchen-only) must not reach these actions directly, only through
// the kitchen board's own, more restrictive checks. Mirrors the "orders" entry in
// ROLE_SECTION_ACCESS, the same rule the admin orders page and sidebar already enforce.
function assertOrdersAccess(role: string) {
  if (!canAccessAdminSection(role, "orders")) {
    return { ok: false as const, error: "No tienes permisos para operar sobre esta orden." }
  }

  return { ok: true as const }
}

export async function updateAdminOrderStatusAction(tenantSlug: string, orderId: string, nextStatus: OrderStatus) {
  const access = await requireAdminAccess(tenantSlug)
  const accessCheck = assertOrdersAccess(access.membership.role)

  if (!accessCheck.ok) {
    return accessCheck
  }

  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await updateAdminOrderStatus(
    supabase,
    access.membership.tenantId,
    orderId,
    nextStatus,
    access.profile.id,
    buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
    revalidatePath(`/app/${tenantSlug}/admin/orders/${orderId}`)
    revalidatePath(`/app/${tenantSlug}/kitchen`)
    revalidatePath(`/app/${tenantSlug}/account/orders`)
    revalidatePath(`/app/${tenantSlug}/orders/${orderId}`)
  }

  return result
}

export async function updateAdminOrderPaymentStatusAction(tenantSlug: string, orderId: string, nextPaymentStatus: PaymentStatus) {
  const access = await requireAdminAccess(tenantSlug)
  const accessCheck = assertOrdersAccess(access.membership.role)

  if (!accessCheck.ok) {
    return accessCheck
  }

  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await updateAdminOrderPaymentStatus(
    supabase,
    access.membership.tenantId,
    orderId,
    nextPaymentStatus,
    buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
    revalidatePath(`/app/${tenantSlug}/admin/orders/${orderId}`)
    revalidatePath(`/app/${tenantSlug}/account/orders`)
    revalidatePath(`/app/${tenantSlug}/orders/${orderId}`)
  }

  return result
}

export async function releaseAdminOrderAssignmentAction(tenantSlug: string, orderId: string) {
  const access = await requireAdminAccess(tenantSlug)
  const accessCheck = assertOrdersAccess(access.membership.role)

  if (!accessCheck.ok) {
    return accessCheck
  }

  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await releaseAdminOrderAssignment(
    supabase,
    access.membership.tenantId,
    orderId,
    buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
    revalidatePath(`/app/${tenantSlug}/admin/orders/${orderId}`)
    revalidatePath(`/app/${tenantSlug}/kitchen`)
    revalidatePath(`/app/${tenantSlug}/account/orders`)
    revalidatePath(`/app/${tenantSlug}/orders/${orderId}`)
  }

  return result
}

export async function rejectManualPaymentAction(tenantSlug: string, orderId: string, rejectionReason: string) {
  const access = await requireAdminAccess(tenantSlug)
  const accessCheck = assertOrdersAccess(access.membership.role)

  if (!accessCheck.ok) {
    return accessCheck
  }

  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await rejectManualPayment(
    supabase,
    access.membership.tenantId,
    orderId,
    rejectionReason,
    access.profile.id,
    buildAuditActor({
      surface: "admin",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
    revalidatePath(`/app/${tenantSlug}/admin/orders/${orderId}`)
    revalidatePath(`/app/${tenantSlug}/account/orders`)
    revalidatePath(`/app/${tenantSlug}/orders/${orderId}`)
  }

  return result
}
