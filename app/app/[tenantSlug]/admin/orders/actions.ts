"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/auth/admin"
import type { OrderStatus, PaymentStatus } from "@/lib/domain/order"
import { rejectManualPayment, updateAdminOrderPaymentStatus, updateAdminOrderStatus } from "@/lib/services/orders"
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
    revalidatePath(`/app/${tenantSlug}/admin/orders/${orderId}`)
    revalidatePath(`/app/${tenantSlug}/kitchen`)
    revalidatePath(`/app/${tenantSlug}/account/orders`)
    revalidatePath(`/app/${tenantSlug}/orders/${orderId}`)
  }

  return result
}

export async function updateAdminOrderPaymentStatusAction(tenantSlug: string, orderId: string, nextPaymentStatus: PaymentStatus) {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await updateAdminOrderPaymentStatus(supabase, access.membership.tenantId, orderId, nextPaymentStatus)

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
    revalidatePath(`/app/${tenantSlug}/admin/orders/${orderId}`)
    revalidatePath(`/app/${tenantSlug}/account/orders`)
    revalidatePath(`/app/${tenantSlug}/orders/${orderId}`)
  }

  return result
}

export async function rejectManualPaymentAction(tenantSlug: string, orderId: string, rejectionReason: string) {
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const result = await rejectManualPayment(supabase, access.membership.tenantId, orderId, rejectionReason)

  if (result.ok) {
    revalidatePath(`/app/${tenantSlug}/admin/orders`)
    revalidatePath(`/app/${tenantSlug}/admin/orders/${orderId}`)
    revalidatePath(`/app/${tenantSlug}/account/orders`)
    revalidatePath(`/app/${tenantSlug}/orders/${orderId}`)
  }

  return result
}
