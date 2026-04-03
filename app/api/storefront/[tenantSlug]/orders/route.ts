import { NextResponse } from "next/server"

import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getCustomerOrders } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type OrdersRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export async function GET(_request: Request, context: OrdersRouteContext) {
  const { tenantSlug } = await context.params
  const customerContext = await getCustomerAccountContext()

  if (!customerContext) {
    return NextResponse.json({ error: "Customer is not authenticated." }, { status: 401 })
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 })
  }

  const orders = await getCustomerOrders(adminClient, tenantSlug, customerContext.customer.id)

  return NextResponse.json({ orders })
}
