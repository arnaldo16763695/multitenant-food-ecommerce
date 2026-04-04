"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import type { OrderStatus } from "@/lib/domain/order"
import { updateAdminOrderStatus } from "@/lib/services/orders"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function updateAdminOrderStatusAction(tenantSlug: string, orderId: string, nextStatus: OrderStatus) {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await updateAdminOrderStatus(supabase, access.membership.tenantId, orderId, nextStatus, access.profile.id)

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
  }

  return result
}
