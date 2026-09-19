import type { ShoppingBagConfiguration, ShoppingBagModifierSelection } from "@/lib/domain/bag"
import { authenticateMobileCustomerRequest } from "@/lib/mobile/customer"
import { mobileError, mobileJson } from "@/lib/mobile/api"
import { addCustomerBagItemConfigurations } from "@/lib/services/customer-bag"

type MobileBagItemConfigurationsRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

type ConfigurationsPayload = {
  readonly branchId?: unknown
  readonly productId?: unknown
  readonly productVariantId?: unknown
  readonly configurations?: unknown
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

// Each entry is one quantity+modifiers combination the customer wants for the same
// product/variant (e.g. "2 sin cebolla" + "1 sin mostaza") -- mirrors the storefront's
// "Agregar otra combinacion" builder. At least one configuration with quantity >= 1 is required;
// a bare single-configuration add should use POST /bag/items instead of this endpoint.
function parseConfigurations(value: unknown): readonly ShoppingBagConfiguration[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null
  }

  const configurations: ShoppingBagConfiguration[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return null
    }

    const quantity = typeof entry.quantity === "number" && Number.isFinite(entry.quantity) ? entry.quantity : NaN
    const modifierSelections = parseModifierSelections(entry.modifierSelections)

    if (Number.isNaN(quantity) || quantity < 1 || !modifierSelections) {
      return null
    }

    configurations.push({ quantity, modifierSelections })
  }

  return configurations
}

export async function POST(request: Request, context: MobileBagItemConfigurationsRouteContext) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const payload = (await request.json()) as ConfigurationsPayload
  const branchId = typeof payload.branchId === "string" ? payload.branchId.trim() : ""
  const productId = typeof payload.productId === "string" ? payload.productId.trim() : ""
  const productVariantId = typeof payload.productVariantId === "string" ? payload.productVariantId.trim() : null
  const configurations = parseConfigurations(payload.configurations)

  if (!branchId || !productId) {
    return mobileError(400, "branchId and productId are required.")
  }

  if (!configurations) {
    return mobileError(400, "configurations must be a non-empty array of { quantity, modifierSelections }.")
  }

  const { tenantSlug } = await context.params
  const result = await addCustomerBagItemConfigurations(authResult.adminClient, {
    tenantSlug,
    branchId,
    customerId: authResult.customerContext.customer.id,
    productId,
    productVariantId,
    configurations,
  })

  if (!result.ok) {
    return mobileError(400, result.error ?? "No pudimos agregar las combinaciones a la bolsa.")
  }

  return mobileJson(result)
}
