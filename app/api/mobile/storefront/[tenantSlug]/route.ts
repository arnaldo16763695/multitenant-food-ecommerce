import { getPublicStorefrontBySlug } from "@/lib/data/public-storefront"
import { mobileError, mobileJson } from "@/lib/mobile/api"

type MobileStorefrontRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export async function GET(request: Request, context: MobileStorefrontRouteContext) {
  const { tenantSlug } = await context.params
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get("branchId")?.trim() || null
  const storefront = await getPublicStorefrontBySlug(tenantSlug, branchId)

  if (!storefront) {
    return mobileError(404, "No encontramos el storefront solicitado.")
  }

  return mobileJson({ storefront })
}
