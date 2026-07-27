import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authenticateMobileCustomerRequest,
  replaceCustomerManualPaymentReceipt,
  buildPaymentProofImagePath,
  getFileExtension,
  getPaymentProofsBucket,
} = vi.hoisted(() => ({
  authenticateMobileCustomerRequest: vi.fn(),
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
  const maybeSingle = vi.fn()

  const adminClient = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({ upload })),
    },
  }

  return { adminClient, upload, maybeSingle }
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
  })

  it("returns 404 when the tenant cannot be resolved", async () => {
    const { adminClient, maybeSingle } = createAdminClient()
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient,
      customerContext: { customer: { id: "customer-1", fullName: "Ana Perez" }, profile: { id: "profile-1", fullName: "Ana Perez" } },
    })
    maybeSingle.mockResolvedValue({ error: null, data: null })

    const response = await POST(createRequest(createFormData()), {
      params: Promise.resolve({ tenantSlug: "demo-brand", orderId: "order-1" }),
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "No encontramos la marca asociada a la orden." })
  })

  it("replaces the receipt and returns ok on success", async () => {
    const { adminClient, maybeSingle, upload } = createAdminClient()
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient,
      customerContext: { customer: { id: "customer-1", fullName: "Ana Perez" }, profile: { id: "profile-1", fullName: "Ana Perez" } },
    })
    maybeSingle.mockResolvedValue({ error: null, data: { id: "tenant-1" } })
    upload.mockResolvedValue({ error: null })
    replaceCustomerManualPaymentReceipt.mockResolvedValue({ ok: true })

    const response = await POST(createRequest(createFormData()), {
      params: Promise.resolve({ tenantSlug: "demo-brand", orderId: "order-1" }),
    })

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
