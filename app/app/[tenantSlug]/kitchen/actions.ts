"use server"

import { revalidatePath } from "next/cache"

import { requireKitchenAccess } from "@/lib/auth/admin"
import type { OrderStatus } from "@/lib/domain/order"
import { buildAuditActor } from "@/lib/services/audit"
import {
  assignKitchenOrder,
  canKitchenMarkOrderReady,
  ensureKitchenAssignmentAccess,
  releaseKitchenOrder,
  updateAdminOrderStatus,
  updateKitchenOrderItemPrepStatus,
} from "@/lib/services/orders"
import { getKitchenBranchIdsForMembership } from "@/lib/services/staff"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const ALLOWED_KITCHEN_STATUSES: readonly OrderStatus[] = ["in_preparation", "ready"]

export async function assignKitchenOrderAction(tenantSlug: string, orderId: string) {
  const access = await requireKitchenAccess(tenantSlug)
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const branchIds = await getKitchenBranchIdsForMembership(supabase, access.membership.tenantId, access.membership.id, access.membership.role)
  const result = await assignKitchenOrder(
    supabase,
    access.membership.tenantId,
    orderId,
    access.membership.id,
    branchIds,
    buildAuditActor({
      surface: "kitchen",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/kitchen`)
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
  }

  return result
}

export async function updateKitchenOrderStatusAction(tenantSlug: string, orderId: string, nextStatus: OrderStatus) {
  if (!ALLOWED_KITCHEN_STATUSES.includes(nextStatus)) {
    return { ok: false, error: "Kitchen no puede mover la orden a ese estado." }
  }

  const access = await requireKitchenAccess(tenantSlug)
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const branchIds = await getKitchenBranchIdsForMembership(supabase, access.membership.tenantId, access.membership.id, access.membership.role)

  const accessCheck = await ensureKitchenAssignmentAccess(
    supabase,
    access.membership.tenantId,
    orderId,
    access.membership.id,
    access.membership.role,
    branchIds
  )

  if (!accessCheck.ok) {
    return accessCheck
  }

  if (nextStatus === "ready") {
    const readyCheck = await canKitchenMarkOrderReady(supabase, access.membership.tenantId, orderId)

    if (!readyCheck.ok) {
      return readyCheck
    }
  }

  const result = await updateAdminOrderStatus(
    supabase,
    access.membership.tenantId,
    orderId,
    nextStatus,
    access.profile.id,
    buildAuditActor({
      surface: "kitchen",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/kitchen`)
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
    revalidatePath(`/app/${tenantSlug}/account/orders`)
    revalidatePath(`/app/${tenantSlug}/orders/${orderId}`)
  }

  return result
}

export async function releaseKitchenOrderAction(tenantSlug: string, orderId: string) {
  const access = await requireKitchenAccess(tenantSlug)
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const branchIds = await getKitchenBranchIdsForMembership(supabase, access.membership.tenantId, access.membership.id, access.membership.role)
  const result = await releaseKitchenOrder(
    supabase,
    access.membership.tenantId,
    orderId,
    access.membership.id,
    branchIds,
    buildAuditActor({
      surface: "kitchen",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/kitchen`)
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
  }

  return result
}

export async function updateKitchenOrderItemPrepStatusAction(
  tenantSlug: string,
  orderId: string,
  orderItemId: string,
  nextPrepStatus: "pending" | "ready"
) {
  const access = await requireKitchenAccess(tenantSlug)
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const branchIds = await getKitchenBranchIdsForMembership(supabase, access.membership.tenantId, access.membership.id, access.membership.role)

  const accessCheck = await ensureKitchenAssignmentAccess(
    supabase,
    access.membership.tenantId,
    orderId,
    access.membership.id,
    access.membership.role,
    branchIds
  )

  if (!accessCheck.ok) {
    return accessCheck
  }

  const result = await updateKitchenOrderItemPrepStatus(
    supabase,
    access.membership.tenantId,
    orderItemId,
    nextPrepStatus,
    buildAuditActor({
      surface: "kitchen",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/kitchen`)
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
    revalidatePath(`/app/${tenantSlug}/account/orders`)
    revalidatePath(`/app/${tenantSlug}/orders/${orderId}`)
  }

  return result
}
