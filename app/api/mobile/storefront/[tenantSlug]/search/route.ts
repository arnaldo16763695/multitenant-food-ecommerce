import { getPublicStorefrontBySlug } from "@/lib/data/public-storefront"
import { mobileError, mobileJson } from "@/lib/mobile/api"

type MobileStorefrontSearchRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase()
}

export async function GET(request: Request, context: MobileStorefrontSearchRouteContext) {
  const { tenantSlug } = await context.params
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get("branchId")?.trim() ?? ""
  const query = searchParams.get("q")?.trim() ?? ""

  if (!branchId) {
    return mobileError(400, "branchId is required.")
  }

  if (!query) {
    return mobileError(400, "q is required.")
  }

  const storefront = await getPublicStorefrontBySlug(tenantSlug, branchId)

  if (!storefront || !storefront.activeBranch) {
    return mobileError(404, "No encontramos la sucursal solicitada.")
  }

  const normalizedQuery = normalizeValue(query)
  const products = storefront.menu.filter((product) => {
    const variantMatch = product.variants.some((variant) => normalizeValue(variant.name).includes(normalizedQuery))
    const modifierMatch = product.modifierGroups.some(
      (group) =>
        normalizeValue(group.name).includes(normalizedQuery) ||
        group.options.some((option) => normalizeValue(option.name).includes(normalizedQuery))
    )

    return (
      normalizeValue(product.name).includes(normalizedQuery) ||
      normalizeValue(product.description).includes(normalizedQuery) ||
      normalizeValue(product.category).includes(normalizedQuery) ||
      variantMatch ||
      modifierMatch
    )
  })

  const categories = [...new Set(products.map((product) => product.category))].map((name) => ({ name }))

  return mobileJson({
    query,
    tenantSlug: storefront.tenant.slug,
    branch: {
      id: storefront.activeBranch.id,
      name: storefront.activeBranch.name,
      heroImageUrl: storefront.activeBranch.heroImageUrl,
      isOpenNow: storefront.activeBranch.isOpenNow,
      acceptingOrders: storefront.activeBranch.acceptingOrders,
      orderingMode: storefront.activeBranch.orderingMode,
      closureLabel: storefront.activeBranch.closureLabel,
      nextTransitionAt: storefront.activeBranch.nextTransitionAt,
      nextTransitionLabel: storefront.activeBranch.nextTransitionLabel,
    },
    categories,
    products,
  })
}
