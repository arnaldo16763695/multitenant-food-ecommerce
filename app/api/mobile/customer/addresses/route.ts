import type { CustomerAddressMutationInput } from "@/lib/domain/customer-address"
import { authenticateMobileCustomerRequest } from "@/lib/mobile/customer"
import { mobileError, mobileJson } from "@/lib/mobile/api"
import { createCustomerAddress, getCustomerAddresses } from "@/lib/services/customer-addresses"

type AddressPayload = {
  readonly label?: unknown
  readonly addressLine1?: unknown
  readonly addressLine2?: unknown
  readonly city?: unknown
  readonly state?: unknown
  readonly postalCode?: unknown
  readonly country?: unknown
  readonly latitude?: unknown
  readonly longitude?: unknown
  readonly deliveryNotes?: unknown
  readonly isDefault?: unknown
}

function parseAddressPayload(payload: AddressPayload): CustomerAddressMutationInput | null {
  const label = typeof payload.label === "string" ? payload.label.trim() : ""
  const addressLine1 = typeof payload.addressLine1 === "string" ? payload.addressLine1.trim() : ""

  if (!label || !addressLine1) {
    return null
  }

  const latitude = typeof payload.latitude === "number" && Number.isFinite(payload.latitude) ? payload.latitude : null
  const longitude = typeof payload.longitude === "number" && Number.isFinite(payload.longitude) ? payload.longitude : null

  return {
    label,
    addressLine1,
    addressLine2: typeof payload.addressLine2 === "string" ? payload.addressLine2.trim() || null : null,
    city: typeof payload.city === "string" ? payload.city.trim() || null : null,
    state: typeof payload.state === "string" ? payload.state.trim() || null : null,
    postalCode: typeof payload.postalCode === "string" ? payload.postalCode.trim() || null : null,
    country: typeof payload.country === "string" ? payload.country.trim() || "MX" : "MX",
    latitude,
    longitude,
    deliveryNotes: typeof payload.deliveryNotes === "string" ? payload.deliveryNotes.trim() || null : null,
    isDefault: Boolean(payload.isDefault),
  }
}

export async function GET(request: Request) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const addresses = await getCustomerAddresses(authResult.adminClient, authResult.customerContext.customer.id)

  return mobileJson({ addresses })
}

export async function POST(request: Request) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const payload = (await request.json()) as AddressPayload
  const parsedInput = parseAddressPayload(payload)

  if (!parsedInput) {
    return mobileError(400, "label and addressLine1 are required.")
  }

  const result = await createCustomerAddress(authResult.adminClient, { ...parsedInput, customerId: authResult.customerContext.customer.id })

  if (!result.ok) {
    return mobileError(400, result.error ?? "No pudimos guardar la dirección.")
  }

  return mobileJson(result)
}
