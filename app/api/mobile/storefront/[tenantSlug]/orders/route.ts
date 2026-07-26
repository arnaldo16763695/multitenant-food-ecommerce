import { authenticateMobileCustomerRequest } from "@/lib/mobile/customer"
import { mobileError, mobileJson } from "@/lib/mobile/api"
import { getCustomerOrders } from "@/lib/services/orders"

type MobileOrdersRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export async function GET(request: Request, context: MobileOrdersRouteContext) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const { tenantSlug } = await context.params
  const orders = await getCustomerOrders(
    authResult.adminClient,
    tenantSlug,
    authResult.customerContext.customer.id,
    authResult.customerContext.customer.email
  )

  return mobileJson({ orders })
}
