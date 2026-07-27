import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authenticateMobileCustomerRequest,
  createStorefrontOrder,
  attachManualPaymentReceipt,
  clearCustomerBranchBag,
  buildPaymentProofImagePath,
  getFileExtension,
  getPaymentProofsBucket,
} = vi.hoisted(() => ({
  authenticateMobileCustomerRequest: vi.fn(),
  createStorefrontOrder: vi.fn(),
  attachManualPaymentReceipt: vi.fn(),
  clearCustomerBranchBag: vi.fn(),
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
    createStorefrontOrder,
    attachManualPaymentReceipt,
  }
})

vi.mock("@/lib/services/customer-bag", () => ({
  clearCustomerBranchBag,
}))

vi.mock("@/lib/supabase/storage", () => ({
  buildPaymentProofImagePath,
  getFileExtension,
  getPaymentProofsBucket,
}))

import { POST } from "@/app/api/mobile/storefront/[tenantSlug]/checkout/route"

function createRequest(formData: FormData) {
  return {
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request
}

function createFormData(overrides?: { branchId?: string; paymentMethod?: string; items?: string }) {
  const formData = new FormData()
  formData.set("branchId", overrides?.branchId ?? "branch-1")
  formData.set("fullName", "Ana Perez")
  formData.set("phone", "+584141234567")
  formData.set("email", "ana@example.com")
  formData.set("notes", "sin cebolla")
  formData.set("fulfillmentType", "pickup")
  formData.set("paymentMethod", overrides?.paymentMethod ?? "mobile_payment")
  formData.set("items", overrides?.items ?? JSON.stringify([{ id: "item-1", productId: "product-1", tenantSlug: "demo-brand", branchId: "branch-1", name: "Burger", description: "", category: "Burgers", unitPrice: 8.5, unitPriceLabel: "$ 8.50", quantity: 1, modifierSelections: [] }]))
  formData.set("paymentProof", new File(["proof"], "receipt.png", { type: "image/png" }))
  return formData
}

function createAdminClient() {
  const upload = vi.fn()
  const remove = vi.fn()
  const deleteEq = vi.fn()
  const maybeSingle = vi.fn()

  const adminClient = {
    from: vi.fn((table: string) => {
      if (table === "tenants") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({ maybeSingle })),
            })),
          })),
        }
      }

      if (table === "orders") {
        return {
          delete: vi.fn(() => ({ eq: deleteEq })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
    storage: {
      from: vi.fn(() => ({ upload, remove })),
    },
  }

  return { adminClient, upload, remove, deleteEq, maybeSingle }
}

describe("POST /api/mobile/storefront/[tenantSlug]/checkout", () => {
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

    const response = await POST(createRequest(createFormData()), { params: Promise.resolve({ tenantSlug: "demo-brand" }) })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Missing Bearer token." })
  })

  it("requires branchId", async () => {
    const response = await POST(createRequest(createFormData({ branchId: "" })), { params: Promise.resolve({ tenantSlug: "demo-brand" }) })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "branchId is required." })
  })

  it("rolls back the order when receipt attachment fails", async () => {
    const { adminClient, upload, remove, deleteEq, maybeSingle } = createAdminClient()
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient,
      customerContext: { customer: { id: "customer-1", fullName: "Ana Perez" }, profile: { id: "profile-1", fullName: "Ana Perez" } },
    })
    createStorefrontOrder.mockResolvedValue({ ok: true, orderId: "order-1", orderNumber: 123 })
    maybeSingle.mockResolvedValue({ error: null, data: { id: "tenant-1" } })
    upload.mockResolvedValue({ error: null })
    attachManualPaymentReceipt.mockResolvedValue({ ok: false, error: "attach failed" })
    remove.mockResolvedValue({ error: null })
    deleteEq.mockResolvedValue({ error: null })

    const response = await POST(createRequest(createFormData()), { params: Promise.resolve({ tenantSlug: "demo-brand" }) })

    expect(remove).toHaveBeenCalledWith(["tenants/tenant-1/orders/order-1/payment-proof/receipt.png"])
    expect(deleteEq).toHaveBeenCalledWith("id", "order-1")
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "attach failed" })
  })

  it("creates the order and clears the bag on success", async () => {
    const { adminClient, upload, maybeSingle } = createAdminClient()
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient,
      customerContext: { customer: { id: "customer-1", fullName: "Ana Perez" }, profile: { id: "profile-1", fullName: "Ana Perez" } },
    })
    createStorefrontOrder.mockResolvedValue({ ok: true, orderId: "order-1", orderNumber: 123 })
    maybeSingle.mockResolvedValue({ error: null, data: { id: "tenant-1" } })
    upload.mockResolvedValue({ error: null })
    attachManualPaymentReceipt.mockResolvedValue({ ok: true })
    clearCustomerBranchBag.mockResolvedValue(undefined)

    const response = await POST(createRequest(createFormData()), { params: Promise.resolve({ tenantSlug: "demo-brand" }) })

    expect(clearCustomerBranchBag).toHaveBeenCalledWith(adminClient, {
      tenantSlug: "demo-brand",
      branchId: "branch-1",
      customerId: "customer-1",
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, orderId: "order-1", orderNumber: 123 })
  })
})
