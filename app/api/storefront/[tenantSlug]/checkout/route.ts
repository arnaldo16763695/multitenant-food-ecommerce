import { NextResponse } from "next/server"

import { getCustomerAccountContext } from "@/lib/auth/customer"
import type { CheckoutBagItemInput, ManualPaymentMethod } from "@/lib/domain/order"
import { buildAuditActor } from "@/lib/services/audit"
import { attachManualPaymentReceipt, createStorefrontOrder } from "@/lib/services/orders"
import { clearCustomerBranchBag } from "@/lib/services/customer-bag"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { buildPaymentProofImagePath, getFileExtension, getPaymentProofsBucket } from "@/lib/supabase/storage"

type CheckoutRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_PAYMENT_PROOF_SIZE = 5 * 1024 * 1024

function isManualPaymentMethod(value: string): value is ManualPaymentMethod {
  return value === "mobile_payment" || value === "bank_transfer"
}

export async function POST(request: Request, context: CheckoutRouteContext) {
  const { tenantSlug } = await context.params
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 })
  }

  const formData = await request.formData()
  const customerContext = await getCustomerAccountContext()

  if (!customerContext) {
    return NextResponse.json({ error: "Inicia sesión para continuar con el checkout." }, { status: 401 })
  }

  const branchId = String(formData.get("branchId") ?? "").trim()
  const fullName = String(formData.get("fullName") ?? "")
  const phone = String(formData.get("phone") ?? "")
  const email = String(formData.get("email") ?? "")
  const notes = String(formData.get("notes") ?? "")
  const fulfillmentType = String(formData.get("fulfillmentType") ?? "pickup")
  const paymentMethod = String(formData.get("paymentMethod") ?? "")
  const paymentProofFile = formData.get("paymentProof")
  const itemsPayload = String(formData.get("items") ?? "[]")

  if (fulfillmentType !== "pickup") {
    return NextResponse.json({ error: "Por ahora el checkout solo admite pickup." }, { status: 400 })
  }

  if (!isManualPaymentMethod(paymentMethod)) {
    return NextResponse.json({ error: "Selecciona un método de pago válido para continuar." }, { status: 400 })
  }

  if (!(paymentProofFile instanceof File) || paymentProofFile.size <= 0) {
    return NextResponse.json({ error: "Adjunta el comprobante de pago antes de enviar tu pedido." }, { status: 400 })
  }

  if (!ALLOWED_IMAGE_TYPES.has(paymentProofFile.type)) {
    return NextResponse.json({ error: "El comprobante debe ser una imagen JPG, PNG o WEBP." }, { status: 400 })
  }

  if (paymentProofFile.size > MAX_PAYMENT_PROOF_SIZE) {
    return NextResponse.json({ error: "El comprobante supera el tamaño máximo permitido de 5 MB." }, { status: 400 })
  }

  let items: readonly CheckoutBagItemInput[] = []

  try {
    items = JSON.parse(itemsPayload) as readonly CheckoutBagItemInput[]
  } catch {
    return NextResponse.json({ error: "No pudimos leer los productos del checkout." }, { status: 400 })
  }

  const result = await createStorefrontOrder(adminClient, {
    tenantSlug,
    branchId,
    customerId: customerContext.customer.id,
    fulfillmentType: "pickup",
    items,
    customer: {
      fullName,
      phone,
      email,
      notes,
    },
    auditActor: buildAuditActor({
      surface: "storefront",
      profileId: customerContext.profile.id,
      name: customerContext.customer.fullName ?? customerContext.profile.fullName,
    }),
  })

  if (!result.ok || !result.orderId) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const tenantResult = await adminClient
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (tenantResult.error || !tenantResult.data) {
    await adminClient.from("orders").delete().eq("id", result.orderId)
    return NextResponse.json({ error: "No pudimos preparar el comprobante de pago para esta orden." }, { status: 500 })
  }

  const fileExtension = getFileExtension(paymentProofFile.name)
  const paymentProofPath = buildPaymentProofImagePath(
    tenantResult.data.id,
    result.orderId,
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
    await adminClient.from("orders").delete().eq("id", result.orderId)
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const attachResult = await attachManualPaymentReceipt(adminClient, result.orderId, {
    paymentMethod,
    receiptImagePath: paymentProofPath,
    auditActor: buildAuditActor({
      surface: "storefront",
      profileId: customerContext.profile.id,
      name: customerContext.customer.fullName ?? customerContext.profile.fullName,
    }),
  })

  if (!attachResult.ok) {
    await adminClient.storage.from(getPaymentProofsBucket()).remove([paymentProofPath])
    await adminClient.from("orders").delete().eq("id", result.orderId)
    return NextResponse.json({ error: attachResult.error ?? "No pudimos adjuntar el comprobante a la orden." }, { status: 500 })
  }

  await clearCustomerBranchBag(adminClient, {
    tenantSlug,
    branchId,
    customerId: customerContext.customer.id,
  })

  return NextResponse.json(result)
}
