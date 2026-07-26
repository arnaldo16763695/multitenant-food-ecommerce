import { authenticateMobileCustomerRequest } from "@/lib/mobile/customer"
import { mobileError, mobileJson } from "@/lib/mobile/api"
import { clearCustomerBranchBag, getCustomerBagItems } from "@/lib/services/customer-bag"

type MobileBagRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

function getBranchId(request: Request) {
  return new URL(request.url).searchParams.get("branchId")?.trim() ?? ""
}

export async function GET(request: Request, context: MobileBagRouteContext) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const { tenantSlug } = await context.params
  const branchId = getBranchId(request)

  if (!branchId) {
    return mobileError(400, "branchId is required.")
  }

  const items = await getCustomerBagItems(
    authResult.adminClient,
    tenantSlug,
    branchId,
    authResult.customerContext.customer.id
  )

  return mobileJson({ items })
}

export async function DELETE(request: Request, context: MobileBagRouteContext) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const { tenantSlug } = await context.params
  const branchId = getBranchId(request)

  if (!branchId) {
    return mobileError(400, "branchId is required.")
  }

  const result = await clearCustomerBranchBag(authResult.adminClient, {
    tenantSlug,
    branchId,
    customerId: authResult.customerContext.customer.id,
  })

  if (!result.ok) {
    return mobileError(400, result.error ?? "No pudimos vaciar la bolsa.")
  }

  return mobileJson({ ok: true, quantity: result.quantity ?? 0 })
}
