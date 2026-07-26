import { authenticateMobileCustomerRequest } from "@/lib/mobile/customer"
import { mobileError, mobileJson } from "@/lib/mobile/api"
import { getCustomerOrderDetail } from "@/lib/services/orders"

type MobileOrderDetailRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
    orderId: string
  }>
}

export async function GET(request: Request, context: MobileOrderDetailRouteContext) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const { tenantSlug, orderId } = await context.params
  const order = await getCustomerOrderDetail(
    authResult.adminClient,
    tenantSlug,
    authResult.customerContext.customer.id,
    orderId,
    authResult.customerContext.customer.email
  )

  if (!order) {
    return mobileError(404, "Order not found.")
  }

  return mobileJson({ order })
}
