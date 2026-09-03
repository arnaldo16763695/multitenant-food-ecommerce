import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getCustomerAccountContext,
  getOwnedPendingPaymentOrder,
  replaceCustomerManualPaymentReceipt,
  createSupabaseAdminClient,
  buildPaymentProofImagePath,
  getFileExtension,
  getPaymentProofsBucket,
} = vi.hoisted(() => ({
  getCustomerAccountContext: vi.fn(),
  getOwnedPendingPaymentOrder: vi.fn(),
  replaceCustomerManualPaymentReceipt: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  buildPaymentProofImagePath: vi.fn(),
  getFileExtension: vi.fn(),
  getPaymentProofsBucket: vi.fn(),
}))

vi.mock("@/lib/auth/customer", () => ({
  getCustomerAccountContext,
}))

vi.mock("@/lib/services/orders", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/orders")>("@/lib/services/orders")

  return {
    ...actual,
    getOwnedPendingPaymentOrder,
    replaceCustomerManualPaymentReceipt,
  }
})

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}))

vi.mock("@/lib/supabase/storage", () => ({
  buildPaymentProofImagePath,
  getFileExtension,
  getPaymentProofsBucket,
}))

import { POST } from "@/app/api/storefront/[tenantSlug]/orders/[orderId]/payment-proof/route"

function createPaymentProofRequest(formData: FormData) {
  return {
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request
}

function createPaymentProofFormData(overrides?: { paymentMethod?: string; paymentProof?: File | string | null }) {
  const formData = new FormData()
  formData.set("paymentMethod", overrides?.paymentMethod ?? "mobile_payment")

  if (overrides?.paymentProof !== undefined) {
    if (overrides.paymentProof instanceof File) {
      formData.set("paymentProof", overrides.paymentProof)
    } else if (overrides.paymentProof !== null) {
      formData.set("paymentProof", overrides.paymentProof)
    }
  } else {
    formData.set("paymentProof", new File(["proof"], "receipt.png", { type: "image/png" }))
  }

  return formData
}

function createAdminClient() {
  const upload = vi.fn()

  const adminClient = {
    storage: {
      from: vi.fn(() => ({ upload })),
    },
  }

  return { adminClient, upload }
}

describe("POST /api/storefront/[tenantSlug]/orders/[orderId]/payment-proof", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getCustomerAccountContext.mockResolvedValue({
      customer: { id: "customer-1", fullName: "Ana Perez" },
      profile: { id: "profile-1", fullName: "Ana Perez" },
    })
    getFileExtension.mockReturnValue("png")
    getPaymentProofsBucket.mockReturnValue("payment-proofs")
    buildPaymentProofImagePath.mockReturnValue("tenants/tenant-1/orders/order-1/payment-proof/receipt.png")
  })

  it("requires an authenticated customer session", async () => {
    const { adminClient } = createAdminClient()
    createSupabaseAdminClient.mockReturnValue(adminClient)
    getCustomerAccountContext.mockResolvedValue(null)

    const response = await POST(createPaymentProofRequest(createPaymentProofFormData()), {
      params: Promise.resolve({ tenantSlug: "demo-brand", orderId: "order-1" }),
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Inicia sesión para actualizar el comprobante." })
    expect(getOwnedPendingPaymentOrder).not.toHaveBeenCalled()
  })

  it("returns 404 when the tenant cannot be resolved, without touching storage", async () => {
    const { adminClient, upload } = createAdminClient()
    createSupabaseAdminClient.mockReturnValue(adminClient)
    getOwnedPendingPaymentOrder.mockResolvedValue({ ok: false, status: 404, error: "No encontramos la marca asociada a la orden." })

    const response = await POST(createPaymentProofRequest(createPaymentProofFormData()), {
      params: Promise.resolve({ tenantSlug: "demo-brand", orderId: "order-1" }),
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "No encontramos la marca asociada a la orden." })
    expect(upload).not.toHaveBeenCalled()
  })

  it("rejects an order the customer does not own before uploading anything to storage", async () => {
    const { adminClient, upload } = createAdminClient()
    createSupabaseAdminClient.mockReturnValue(adminClient)
    getOwnedPendingPaymentOrder.mockResolvedValue({ ok: false, status: 400, error: "No encontramos la orden dentro de tu cuenta." })

    const response = await POST(createPaymentProofRequest(createPaymentProofFormData()), {
      params: Promise.resolve({ tenantSlug: "demo-brand", orderId: "order-1" }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "No encontramos la orden dentro de tu cuenta." })
    expect(upload).not.toHaveBeenCalled()
    expect(replaceCustomerManualPaymentReceipt).not.toHaveBeenCalled()
  })

  it("returns 500 when upload fails", async () => {
    const { adminClient, upload } = createAdminClient()
    createSupabaseAdminClient.mockReturnValue(adminClient)
    getOwnedPendingPaymentOrder.mockResolvedValue({ ok: true, tenantId: "tenant-1", order: { id: "order-1" } })
    upload.mockResolvedValue({ error: { message: "storage failed" } })

    const response = await POST(createPaymentProofRequest(createPaymentProofFormData()), {
      params: Promise.resolve({ tenantSlug: "demo-brand", orderId: "order-1" }),
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "storage failed" })
  })

  it("replaces the receipt and returns ok on success", async () => {
    const { adminClient, upload } = createAdminClient()
    createSupabaseAdminClient.mockReturnValue(adminClient)
    getOwnedPendingPaymentOrder.mockResolvedValue({ ok: true, tenantId: "tenant-1", order: { id: "order-1" } })
    upload.mockResolvedValue({ error: null })
    replaceCustomerManualPaymentReceipt.mockResolvedValue({ ok: true })

    const response = await POST(createPaymentProofRequest(createPaymentProofFormData()), {
      params: Promise.resolve({ tenantSlug: "demo-brand", orderId: "order-1" }),
    })

    expect(getOwnedPendingPaymentOrder).toHaveBeenCalledWith(adminClient, "demo-brand", "customer-1", "order-1")
    expect(replaceCustomerManualPaymentReceipt).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        tenantSlug: "demo-brand",
        customerId: "customer-1",
        orderId: "order-1",
        paymentMethod: "mobile_payment",
        receiptImagePath: "tenants/tenant-1/orders/order-1/payment-proof/receipt.png",
      })
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
