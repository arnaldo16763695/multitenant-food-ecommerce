"use server"

import { revalidatePath } from "next/cache"

import { requireKitchenAccess } from "@/lib/auth/admin"
import type { OrderStatus } from "@/lib/domain/order"
import {
  assignKitchenOrder,
  canKitchenMarkOrderReady,
  ensureKitchenAssignmentAccess,
  updateAdminOrderStatus,
  updateKitchenOrderItemPrepStatus,
} from "@/lib/services/orders"
import { getActiveBranchIdsForMembership } from "@/lib/services/staff"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const ALLOWED_KITCHEN_STATUSES: readonly OrderStatus[] = ["in_preparation", "ready", "completed"]

export async function assignKitchenOrderAction(tenantSlug: string, orderId: string) {
  const access = await requireKitchenAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const branchIds = await getActiveBranchIdsForMembership(supabase, access.membership.id)
  const result = await assignKitchenOrder(supabase, access.membership.tenantId, orderId, access.membership.id, branchIds)

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
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const branchIds = await getActiveBranchIdsForMembership(supabase, access.membership.id)

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

  const result = await updateAdminOrderStatus(supabase, access.membership.tenantId, orderId, nextStatus, access.profile.id)

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/kitchen`)
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
    revalidatePath(`/app/${tenantSlug}/account/orders`)
    revalidatePath(`/app/${tenantSlug}/orders/${orderId}`)
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
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const branchIds = await getActiveBranchIdsForMembership(supabase, access.membership.id)

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

  const result = await updateKitchenOrderItemPrepStatus(supabase, access.membership.tenantId, orderItemId, nextPrepStatus)

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/kitchen`)
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
    revalidatePath(`/app/${tenantSlug}/account/orders`)
    revalidatePath(`/app/${tenantSlug}/orders/${orderId}`)
  }

  return result
}
