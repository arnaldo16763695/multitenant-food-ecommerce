"use server"

import { createStorefrontOrder } from "@/lib/services/orders"
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

  return createStorefrontOrder(adminClient, {
    tenantSlug: payload.tenantSlug,
    branchId: payload.branchId,
    customerId: customerContext?.customer.id ?? null,
    fulfillmentType: payload.fulfillmentType,
    items: payload.items,
    customer: {
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      notes: payload.notes,
    },
  })
}
