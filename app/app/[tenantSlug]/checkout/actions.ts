"use server"

import { createStorefrontOrder } from "@/lib/services/orders"
import { buildAuditActor } from "@/lib/services/audit"
import { clearCustomerBranchBag } from "@/lib/services/customer-bag"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getCustomerAccountContext } from "@/lib/auth/customer"
import type { CheckoutBagItemInput, CreateOrderResult } from "@/lib/domain/order"

type CheckoutPayload = {
  readonly tenantSlug: string
  readonly branchId: string
  readonly items: readonly CheckoutBagItemInput[]
  readonly fullName: string
  readonly phone: string
  readonly email: string
  readonly notes?: string
  readonly fulfillmentType: "pickup" | "delivery"
}

export async function createStorefrontOrderAction(payload: CheckoutPayload): Promise<CreateOrderResult> {
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const customerContext = await getCustomerAccountContext()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para continuar con el checkout." }
  }

  const result = await createStorefrontOrder(adminClient, {
    tenantSlug: payload.tenantSlug,
    branchId: payload.branchId,
    customerId: customerContext.customer.id,
    fulfillmentType: payload.fulfillmentType,
    items: payload.items,
      customer: {
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        notes: payload.notes,
      },
      auditActor: buildAuditActor({
        surface: "storefront",
        profileId: customerContext.profile.id,
        name: customerContext.customer.fullName ?? customerContext.profile.fullName,
      }),
    })

  if (result.ok) {
    await clearCustomerBranchBag(adminClient, {
      tenantSlug: payload.tenantSlug,
      branchId: payload.branchId,
      customerId: customerContext.customer.id,
    })
  }

  return result
}
