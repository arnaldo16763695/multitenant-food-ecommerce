import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authenticateMobileCustomerRequest,
  getOwnedPendingPaymentOrder,
  replaceCustomerManualPaymentReceipt,
  buildPaymentProofImagePath,
  getFileExtension,
  getPaymentProofsBucket,
} = vi.hoisted(() => ({
  authenticateMobileCustomerRequest: vi.fn(),
  getOwnedPendingPaymentOrder: vi.fn(),
  replaceCustomerManualPaymentReceipt: vi.fn(),
  buildPaymentProofImagePath: vi.fn(),
  getFileExtension: vi.fn(),
  getPaymentProofsBucket: vi.fn(),
}))

vi.mock("@/lib/mobile/customer", () => ({
  authenticateMobileCustomerRequest,
}))

vi.mock("@/lib/services/orders", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/orders")>("@/lib/services/orders")

  return {
    ...actual,
    getOwnedPendingPaymentOrder,
    replaceCustomerManualPaymentReceipt,
  }
})

vi.mock("@/lib/supabase/storage", () => ({
  buildPaymentProofImagePath,
  getFileExtension,
  getPaymentProofsBucket,
}))

import { POST } from "@/app/api/mobile/storefront/[tenantSlug]/orders/[orderId]/payment-proof/route"

function createRequest(formData: FormData) {
  return { formData: vi.fn().mockResolvedValue(formData) } as unknown as Request
}

function createFormData(paymentMethod = "mobile_payment") {
  const formData = new FormData()
  formData.set("paymentMethod", paymentMethod)
  formData.set("paymentProof", new File(["proof"], "receipt.png", { type: "image/png" }))
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

describe("POST /api/mobile/storefront/[tenantSlug]/orders/[orderId]/payment-proof", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const { adminClient } = createAdminClient()
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient,
      customerContext: {
        customer: { id: "customer-1", fullName: "Ana Perez" },
        profile: { id: "profile-1", fullName: "Ana Perez" },
      },
    })
    getFileExtension.mockReturnValue("png")
    getPaymentProofsBucket.mockReturnValue("payment-proofs")
    buildPaymentProofImagePath.mockReturnValue("tenants/tenant-1/orders/order-1/payment-proof/receipt.png")
  })

  it("returns auth failures from the mobile auth layer", async () => {
    authenticateMobileCustomerRequest.mockResolvedValue({ ok: false, status: 401, error: "Missing Bearer token." })

    const response = await POST(createRequest(createFormData()), {
      params: Promise.resolve({ tenantSlug: "demo-brand", orderId: "order-1" }),
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Missing Bearer token." })
    expect(getOwnedPendingPaymentOrder).not.toHaveBeenCalled()
  })

  it("returns 404 when the tenant cannot be resolved, without touching storage", async () => {
    const { adminClient, upload } = createAdminClient()
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient,
      customerContext: { customer: { id: "customer-1", fullName: "Ana Perez" }, profile: { id: "profile-1", fullName: "Ana Perez" } },
    })
    getOwnedPendingPaymentOrder.mockResolvedValue({ ok: false, status: 404, error: "No encontramos la marca asociada a la orden." })

    const response = await POST(createRequest(createFormData()), {
      params: Promise.resolve({ tenantSlug: "demo-brand", orderId: "order-1" }),
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "No encontramos la marca asociada a la orden." })
    expect(upload).not.toHaveBeenCalled()
  })

  it("rejects an order the customer does not own before uploading anything to storage", async () => {
    const { adminClient, upload } = createAdminClient()
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient,
      customerContext: { customer: { id: "customer-1", fullName: "Ana Perez" }, profile: { id: "profile-1", fullName: "Ana Perez" } },
    })
    getOwnedPendingPaymentOrder.mockResolvedValue({ ok: false, status: 400, error: "No encontramos la orden dentro de tu cuenta." })

    const response = await POST(createRequest(createFormData()), {
      params: Promise.resolve({ tenantSlug: "demo-brand", orderId: "order-1" }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "No encontramos la orden dentro de tu cuenta." })
    expect(upload).not.toHaveBeenCalled()
    expect(replaceCustomerManualPaymentReceipt).not.toHaveBeenCalled()
  })

  it("replaces the receipt and returns ok on success", async () => {
    const { adminClient, upload } = createAdminClient()
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient,
      customerContext: { customer: { id: "customer-1", fullName: "Ana Perez" }, profile: { id: "profile-1", fullName: "Ana Perez" } },
    })
    getOwnedPendingPaymentOrder.mockResolvedValue({ ok: true, tenantId: "tenant-1", order: { id: "order-1" } })
    upload.mockResolvedValue({ error: null })
    replaceCustomerManualPaymentReceipt.mockResolvedValue({ ok: true })

    const response = await POST(createRequest(createFormData()), {
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
