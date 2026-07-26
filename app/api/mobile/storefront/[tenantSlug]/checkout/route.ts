import { mobileError, mobileJson } from "@/lib/mobile/api"
import { authenticateMobileCustomerRequest } from "@/lib/mobile/customer"
import type { CheckoutBagItemInput, ManualPaymentMethod } from "@/lib/domain/order"
import { attachManualPaymentReceipt, createStorefrontOrder } from "@/lib/services/orders"
import { clearCustomerBranchBag } from "@/lib/services/customer-bag"
import { buildPaymentProofImagePath, getFileExtension, getPaymentProofsBucket } from "@/lib/supabase/storage"

type MobileCheckoutRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

type TenantRow = {
  id: string
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_PAYMENT_PROOF_SIZE = 5 * 1024 * 1024

function isManualPaymentMethod(value: string): value is ManualPaymentMethod {
  return value === "mobile_payment" || value === "bank_transfer"
}

export async function POST(request: Request, context: MobileCheckoutRouteContext) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const { tenantSlug } = await context.params
  const formData = await request.formData()
  const branchId = String(formData.get("branchId") ?? "").trim()
  const fullName = String(formData.get("fullName") ?? "")
  const phone = String(formData.get("phone") ?? "")
  const email = String(formData.get("email") ?? "")
  const notes = String(formData.get("notes") ?? "")
  const fulfillmentType = String(formData.get("fulfillmentType") ?? "pickup")
  const paymentMethod = String(formData.get("paymentMethod") ?? "")
  const paymentProofFile = formData.get("paymentProof")
  const itemsPayload = String(formData.get("items") ?? "[]")

  if (!branchId) {
    return mobileError(400, "branchId is required.")
  }

  if (fulfillmentType !== "pickup") {
    return mobileError(400, "Por ahora el checkout solo admite pickup.")
  }

  if (!isManualPaymentMethod(paymentMethod)) {
    return mobileError(400, "Selecciona un metodo de pago valido para continuar.")
  }

  if (!(paymentProofFile instanceof File) || paymentProofFile.size <= 0) {
    return mobileError(400, "Adjunta el comprobante de pago antes de enviar tu pedido.")
  }

  if (!ALLOWED_IMAGE_TYPES.has(paymentProofFile.type)) {
    return mobileError(400, "El comprobante debe ser una imagen JPG, PNG o WEBP.")
  }

  if (paymentProofFile.size > MAX_PAYMENT_PROOF_SIZE) {
    return mobileError(400, "El comprobante supera el tamano maximo permitido de 5 MB.")
  }

  let items: readonly CheckoutBagItemInput[] = []

  try {
    items = JSON.parse(itemsPayload) as readonly CheckoutBagItemInput[]
  } catch {
    return mobileError(400, "No pudimos leer los productos del checkout.")
  }

  const result = await createStorefrontOrder(authResult.adminClient, {
    tenantSlug,
    branchId,
    customerId: authResult.customerContext.customer.id,
    fulfillmentType: "pickup",
    items,
    customer: {
      fullName,
      phone,
      email,
      notes,
    },
  })

  if (!result.ok || !result.orderId) {
    return mobileError(400, result.error ?? "No pudimos crear la orden.")
  }

  const tenantResult = await authResult.adminClient
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .limit(1)
    .maybeSingle<TenantRow>()

  if (tenantResult.error || !tenantResult.data) {
    await authResult.adminClient.from("orders").delete().eq("id", result.orderId)
    return mobileError(500, "No pudimos preparar el comprobante de pago para esta orden.")
  }

  const fileExtension = getFileExtension(paymentProofFile.name)
  const paymentProofPath = buildPaymentProofImagePath(
    tenantResult.data.id,
    result.orderId,
    `receipt-${Date.now()}-${crypto.randomUUID()}.${fileExtension}`
  )
  const uploadResult = await authResult.adminClient.storage
    .from(getPaymentProofsBucket())
    .upload(paymentProofPath, Buffer.from(await paymentProofFile.arrayBuffer()), {
      cacheControl: "3600",
      contentType: paymentProofFile.type,
      upsert: true,
    })

  if (uploadResult.error) {
    await authResult.adminClient.from("orders").delete().eq("id", result.orderId)
    return mobileError(500, uploadResult.error.message)
  }

  const attachResult = await attachManualPaymentReceipt(authResult.adminClient, result.orderId, {
    paymentMethod,
    receiptImagePath: paymentProofPath,
  })

  if (!attachResult.ok) {
    await authResult.adminClient.storage.from(getPaymentProofsBucket()).remove([paymentProofPath])
    await authResult.adminClient.from("orders").delete().eq("id", result.orderId)
    return mobileError(500, attachResult.error ?? "No pudimos adjuntar el comprobante a la orden.")
  }

  await clearCustomerBranchBag(authResult.adminClient, {
    tenantSlug,
    branchId,
    customerId: authResult.customerContext.customer.id,
  })

  return mobileJson(result)
}
