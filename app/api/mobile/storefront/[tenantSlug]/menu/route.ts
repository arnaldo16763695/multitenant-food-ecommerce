import { getPublicStorefrontBySlug } from "@/lib/data/public-storefront"
import { mobileError, mobileJson } from "@/lib/mobile/api"

type MobileStorefrontMenuRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export async function GET(request: Request, context: MobileStorefrontMenuRouteContext) {
  const { tenantSlug } = await context.params
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get("branchId")?.trim() ?? ""

  if (!branchId) {
    return mobileError(400, "branchId is required.")
  }

  const storefront = await getPublicStorefrontBySlug(tenantSlug, branchId)

  if (!storefront || !storefront.activeBranch) {
    return mobileError(404, "No encontramos el menu solicitado para esta sucursal.")
  }

  const categories = [...new Set(storefront.menu.map((product) => product.category))].map((name) => ({ name }))

  return mobileJson({
    tenantSlug: storefront.tenant.slug,
    branch: {
      id: storefront.activeBranch.id,
      name: storefront.activeBranch.name,
      heroImageUrl: storefront.activeBranch.heroImageUrl,
    },
    categories,
    products: storefront.menu,
  })
}
