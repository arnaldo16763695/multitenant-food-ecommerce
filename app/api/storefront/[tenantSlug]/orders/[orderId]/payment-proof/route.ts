import { NextResponse } from "next/server"

import { getCustomerAccountContext } from "@/lib/auth/customer"
import type { ManualPaymentMethod } from "@/lib/domain/order"
import { buildAuditActor } from "@/lib/services/audit"
import { getOwnedPendingPaymentOrder, replaceCustomerManualPaymentReceipt } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { buildPaymentProofImagePath, getFileExtension, getPaymentProofsBucket } from "@/lib/supabase/storage"

type PaymentProofRouteContext = {
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

export async function POST(request: Request, context: PaymentProofRouteContext) {
  const { tenantSlug, orderId } = await context.params
  const customerContext = await getCustomerAccountContext()
  const adminClient = createSupabaseAdminClient()

  if (!customerContext) {
    return NextResponse.json({ error: "Inicia sesión para actualizar el comprobante." }, { status: 401 })
  }

  if (!adminClient) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 })
  }

  const formData = await request.formData()
  const paymentMethod = String(formData.get("paymentMethod") ?? "")
  const paymentProofFile = formData.get("paymentProof")

  if (!isManualPaymentMethod(paymentMethod)) {
    return NextResponse.json({ error: "Selecciona un método de pago válido para continuar." }, { status: 400 })
  }

  if (!(paymentProofFile instanceof File) || paymentProofFile.size <= 0) {
    return NextResponse.json({ error: "Adjunta el comprobante de pago antes de continuar." }, { status: 400 })
  }

  if (!ALLOWED_IMAGE_TYPES.has(paymentProofFile.type)) {
    return NextResponse.json({ error: "El comprobante debe ser una imagen JPG, PNG o WEBP." }, { status: 400 })
  }

  if (paymentProofFile.size > MAX_PAYMENT_PROOF_SIZE) {
    return NextResponse.json({ error: "El comprobante supera el tamaño máximo permitido de 5 MB." }, { status: 400 })
  }

  // Verify ownership BEFORE writing anything to storage -- otherwise an authenticated customer
  // who knows/guesses another customer's orderId could upload a file into that order's storage
  // path even though the later DB write gets correctly rejected.
  const ownedOrderResult = await getOwnedPendingPaymentOrder(adminClient, tenantSlug, customerContext.customer.id, orderId)

  if (!ownedOrderResult.ok) {
    return NextResponse.json({ error: ownedOrderResult.error }, { status: ownedOrderResult.status })
  }

  const fileExtension = getFileExtension(paymentProofFile.name)
  const paymentProofPath = buildPaymentProofImagePath(
    ownedOrderResult.tenantId,
    orderId,
    `receipt-${Date.now()}-${crypto.randomUUID()}.${fileExtension}`
  )
  const uploadResult = await adminClient.storage
    .from(getPaymentProofsBucket())
    .upload(paymentProofPath, Buffer.from(await paymentProofFile.arrayBuffer()), {
      cacheControl: "3600",
      contentType: paymentProofFile.type,
      upsert: true,
    })

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const result = await replaceCustomerManualPaymentReceipt(adminClient, {
    tenantSlug,
    customerId: customerContext.customer.id,
    orderId,
    paymentMethod,
    receiptImagePath: paymentProofPath,
    auditActor: buildAuditActor({
      surface: "storefront",
      profileId: customerContext.profile.id,
      name: customerContext.customer.fullName ?? customerContext.profile.fullName,
    }),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "No pudimos actualizar el comprobante." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
