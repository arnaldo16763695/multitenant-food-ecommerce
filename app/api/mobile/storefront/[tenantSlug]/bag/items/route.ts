import type { ShoppingBagModifierSelection } from "@/lib/domain/bag"
import { authenticateMobileCustomerRequest } from "@/lib/mobile/customer"
import { mobileError, mobileJson } from "@/lib/mobile/api"
import { addCustomerBagItem } from "@/lib/services/customer-bag"

type MobileBagItemsRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

type BagItemPayload = {
  readonly branchId?: unknown
  readonly productId?: unknown
  readonly productVariantId?: unknown
  readonly quantity?: unknown
  readonly modifierSelections?: unknown
}

function formatMoney(value: number) {
  return `$ ${value.toFixed(2)}`
}

function parseModifierSelections(value: unknown): readonly ShoppingBagModifierSelection[] | null {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    return null
  }

  const selections: ShoppingBagModifierSelection[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return null
    }

    const modifierGroupId = typeof entry.modifierGroupId === "string" ? entry.modifierGroupId.trim() : ""
    const modifierGroupName = typeof entry.modifierGroupName === "string" ? entry.modifierGroupName.trim() : ""
    const modifierOptionId = typeof entry.modifierOptionId === "string" ? entry.modifierOptionId.trim() : ""
    const modifierOptionName = typeof entry.modifierOptionName === "string" ? entry.modifierOptionName.trim() : ""
    const priceDelta = typeof entry.priceDelta === "number" && Number.isFinite(entry.priceDelta) ? entry.priceDelta : NaN

    if (!modifierGroupId || !modifierGroupName || !modifierOptionId || !modifierOptionName || Number.isNaN(priceDelta)) {
      return null
    }

    selections.push({
      modifierGroupId,
      modifierGroupName,
      modifierOptionId,
      modifierOptionName,
      priceDelta,
      priceDeltaLabel: formatMoney(priceDelta),
    })
  }

  return selections
}

export async function POST(request: Request, context: MobileBagItemsRouteContext) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const payload = (await request.json()) as BagItemPayload
  const branchId = typeof payload.branchId === "string" ? payload.branchId.trim() : ""
  const productId = typeof payload.productId === "string" ? payload.productId.trim() : ""
  const productVariantId = typeof payload.productVariantId === "string" ? payload.productVariantId.trim() : null
  const quantity = typeof payload.quantity === "number" && Number.isFinite(payload.quantity) ? payload.quantity : 1
  const modifierSelections = parseModifierSelections(payload.modifierSelections)

  if (!branchId || !productId) {
    return mobileError(400, "branchId and productId are required.")
  }

  if (!modifierSelections) {
    return mobileError(400, "modifierSelections must be a valid array.")
  }

  const { tenantSlug } = await context.params
  const result = await addCustomerBagItem(authResult.adminClient, {
    tenantSlug,
    branchId,
    customerId: authResult.customerContext.customer.id,
    productId,
    productVariantId,
    quantity,
    modifierSelections,
  })

  if (!result.ok) {
    return mobileError(400, result.error ?? "No pudimos agregar el producto a la bolsa.")
  }

  return mobileJson(result)
}
