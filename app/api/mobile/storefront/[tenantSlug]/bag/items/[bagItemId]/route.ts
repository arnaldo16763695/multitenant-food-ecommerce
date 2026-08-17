import type { ShoppingBagModifierSelection } from "@/lib/domain/bag"
import { authenticateMobileCustomerRequest } from "@/lib/mobile/customer"
import { mobileError, mobileJson } from "@/lib/mobile/api"
import { decrementCustomerBagItem, removeCustomerBagItem, replaceCustomerBagItem } from "@/lib/services/customer-bag"

type MobileBagItemRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
    bagItemId: string
  }>
}

type ReplaceBagItemPayload = {
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
      // The mobile client doesn't send modifier_kind for bag mutations (it isn't persisted on
      // customer_bag_item_modifiers); getCustomerBagItems resolves the real value on the next read.
      modifierKind: "choice",
      modifierOptionId,
      modifierOptionName,
      priceDelta,
      priceDeltaLabel: formatMoney(priceDelta),
    })
  }

  return selections
}

function getBranchId(request: Request) {
  return new URL(request.url).searchParams.get("branchId")?.trim() ?? ""
}

export async function PATCH(request: Request, context: MobileBagItemRouteContext) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const { tenantSlug, bagItemId } = await context.params
  const payload = (await request.json()) as ReplaceBagItemPayload
  const branchId = typeof payload.branchId === "string" ? payload.branchId.trim() : ""
  const productId = typeof payload.productId === "string" ? payload.productId.trim() : ""
  const productVariantId = typeof payload.productVariantId === "string" ? payload.productVariantId.trim() : null
  const quantity = typeof payload.quantity === "number" && Number.isFinite(payload.quantity) ? payload.quantity : NaN
  const modifierSelections = parseModifierSelections(payload.modifierSelections)

  if (!branchId || !productId || Number.isNaN(quantity)) {
    return mobileError(400, "branchId, productId and quantity are required.")
  }

  if (!modifierSelections) {
    return mobileError(400, "modifierSelections must be a valid array.")
  }

  const result = await replaceCustomerBagItem(authResult.adminClient, {
    bagItemId,
    tenantSlug,
    branchId,
    customerId: authResult.customerContext.customer.id,
    productId,
    productVariantId,
    quantity,
    modifierSelections,
  })

  if (!result.ok) {
    return mobileError(400, result.error ?? "No pudimos actualizar el item de la bolsa.")
  }

  return mobileJson(result)
}

export async function DELETE(request: Request, context: MobileBagItemRouteContext) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const { tenantSlug, bagItemId } = await context.params
  const branchId = getBranchId(request)

  if (!branchId) {
    return mobileError(400, "branchId is required.")
  }

  const result = await removeCustomerBagItem(authResult.adminClient, {
    bagItemId,
    tenantSlug,
    branchId,
    customerId: authResult.customerContext.customer.id,
    productId: "",
    productVariantId: null,
  })

  if (!result.ok) {
    return mobileError(400, result.error ?? "No pudimos eliminar el item de la bolsa.")
  }

  return mobileJson(result)
}

export async function POST(request: Request, context: MobileBagItemRouteContext) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const { tenantSlug, bagItemId } = await context.params
  const branchId = getBranchId(request)

  if (!branchId) {
    return mobileError(400, "branchId is required.")
  }

  const result = await decrementCustomerBagItem(authResult.adminClient, {
    bagItemId,
    tenantSlug,
    branchId,
    customerId: authResult.customerContext.customer.id,
    productId: "",
    productVariantId: null,
  })

  if (!result.ok) {
    return mobileError(400, result.error ?? "No pudimos decrementar el item de la bolsa.")
  }

  return mobileJson(result)
}
