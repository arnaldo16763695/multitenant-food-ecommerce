"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import type { OrderStatus } from "@/lib/domain/order"
import { updateAdminOrderStatus } from "@/lib/services/orders"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const ALLOWED_KITCHEN_STATUSES: readonly OrderStatus[] = ["in_preparation", "ready", "completed"]

export async function updateKitchenOrderStatusAction(tenantSlug: string, orderId: string, nextStatus: OrderStatus) {
  if (!ALLOWED_KITCHEN_STATUSES.includes(nextStatus)) {
    return { ok: false, error: "Kitchen no puede mover la orden a ese estado." }
  }

  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
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
