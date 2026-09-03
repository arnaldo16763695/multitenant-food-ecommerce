import type { ManualPaymentMethod } from "@/lib/domain/order"
import { buildAuditActor } from "@/lib/services/audit"
import { mobileError, mobileJson } from "@/lib/mobile/api"
import { authenticateMobileCustomerRequest } from "@/lib/mobile/customer"
import { getOwnedPendingPaymentOrder, replaceCustomerManualPaymentReceipt } from "@/lib/services/orders"
import { buildPaymentProofImagePath, getFileExtension, getPaymentProofsBucket } from "@/lib/supabase/storage"

type MobilePaymentProofRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
    orderId: string
  }>
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_PAYMENT_PROOF_SIZE = 5 * 1024 * 1024

function isManualPaymentMethod(value: string): value is ManualPaymentMethod {
  return value === "mobile_payment" || value === "bank_transfer"
}

export async function POST(request: Request, context: MobilePaymentProofRouteContext) {
  const authResult = await authenticateMobileCustomerRequest(request)

  if (!authResult.ok) {
    return mobileError(authResult.status, authResult.error)
  }

  const { tenantSlug, orderId } = await context.params
  const formData = await request.formData()
  const paymentMethod = String(formData.get("paymentMethod") ?? "")
  const paymentProofFile = formData.get("paymentProof")

  if (!isManualPaymentMethod(paymentMethod)) {
    return mobileError(400, "Selecciona un metodo de pago valido para continuar.")
  }

  if (!(paymentProofFile instanceof File) || paymentProofFile.size <= 0) {
    return mobileError(400, "Adjunta el comprobante de pago antes de continuar.")
  }

  if (!ALLOWED_IMAGE_TYPES.has(paymentProofFile.type)) {
    return mobileError(400, "El comprobante debe ser una imagen JPG, PNG o WEBP.")
  }

  if (paymentProofFile.size > MAX_PAYMENT_PROOF_SIZE) {
    return mobileError(400, "El comprobante supera el tamano maximo permitido de 5 MB.")
  }

  // Verify ownership BEFORE writing anything to storage -- otherwise an authenticated customer
  // who knows/guesses another customer's orderId could upload a file into that order's storage
  // path even though the later DB write gets correctly rejected.
  const ownedOrderResult = await getOwnedPendingPaymentOrder(
    authResult.adminClient,
    tenantSlug,
    authResult.customerContext.customer.id,
    orderId
  )

  if (!ownedOrderResult.ok) {
    return mobileError(ownedOrderResult.status, ownedOrderResult.error)
  }

  const fileExtension = getFileExtension(paymentProofFile.name)
  const paymentProofPath = buildPaymentProofImagePath(
    ownedOrderResult.tenantId,
    orderId,
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
    return mobileError(500, uploadResult.error.message)
  }

  const result = await replaceCustomerManualPaymentReceipt(authResult.adminClient, {
    tenantSlug,
    customerId: authResult.customerContext.customer.id,
    orderId,
    paymentMethod,
    receiptImagePath: paymentProofPath,
    auditActor: buildAuditActor({
      surface: "mobile_api",
      profileId: authResult.customerContext.profile.id,
      name: authResult.customerContext.customer.fullName ?? authResult.customerContext.profile.fullName,
    }),
  })

  if (!result.ok) {
    return mobileError(400, result.error ?? "No pudimos actualizar el comprobante.")
  }

  return mobileJson({ ok: true })
}
