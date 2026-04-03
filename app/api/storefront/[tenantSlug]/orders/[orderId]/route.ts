import { NextResponse } from "next/server"

import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getCustomerOrderDetail } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type OrderDetailRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
    orderId: string
  }>
}

export async function GET(_request: Request, context: OrderDetailRouteContext) {
  const { tenantSlug, orderId } = await context.params
  const customerContext = await getCustomerAccountContext()

  if (!customerContext) {
    return NextResponse.json({ error: "Customer is not authenticated." }, { status: 401 })
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 })
  }

  const order = await getCustomerOrderDetail(adminClient, tenantSlug, customerContext.customer.id, orderId)

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 })
  }

  return NextResponse.json({ order })
}
