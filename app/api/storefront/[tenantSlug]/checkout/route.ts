import { NextResponse } from "next/server"

import { getCustomerAccountContext } from "@/lib/auth/customer"
import type { CheckoutBagItemInput } from "@/lib/domain/order"
import { createStorefrontOrder } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type CheckoutRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

type CheckoutRequestBody = {
  readonly items: readonly CheckoutBagItemInput[]
  readonly fullName: string
  readonly phone: string
  readonly email: string
  readonly notes?: string
  readonly fulfillmentType: "pickup" | "delivery"
}

export async function POST(request: Request, context: CheckoutRouteContext) {
  const { tenantSlug } = await context.params
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 })
  }

  const body = (await request.json()) as CheckoutRequestBody
  const customerContext = await getCustomerAccountContext()

  const result = await createStorefrontOrder(adminClient, {
    tenantSlug,
    customerId: customerContext?.customer.id ?? null,
    fulfillmentType: body.fulfillmentType,
    items: body.items,
    customer: {
      fullName: body.fullName,
      phone: body.phone,
      email: body.email,
      notes: body.notes,
    },
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
