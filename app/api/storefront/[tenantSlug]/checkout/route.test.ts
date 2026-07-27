import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getCustomerAccountContext,
  createStorefrontOrder,
  attachManualPaymentReceipt,
  clearCustomerBranchBag,
  createSupabaseAdminClient,
  buildPaymentProofImagePath,
  getFileExtension,
  getPaymentProofsBucket,
} = vi.hoisted(() => ({
  getCustomerAccountContext: vi.fn(),
  createStorefrontOrder: vi.fn(),
  attachManualPaymentReceipt: vi.fn(),
  clearCustomerBranchBag: vi.fn(),
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
    createStorefrontOrder,
    attachManualPaymentReceipt,
  }
})

vi.mock("@/lib/services/customer-bag", () => ({
  clearCustomerBranchBag,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}))

vi.mock("@/lib/supabase/storage", () => ({
  buildPaymentProofImagePath,
  getFileExtension,
  getPaymentProofsBucket,
}))

import { POST } from "@/app/api/storefront/[tenantSlug]/checkout/route"

function createCheckoutFormData(overrides?: {
  paymentMethod?: string
  fulfillmentType?: string
  items?: string
  paymentProof?: File | string | null
}) {
  const formData = new FormData()
  formData.set("branchId", "branch-1")
  formData.set("fullName", "Ana Perez")
  formData.set("phone", "+584141234567")
  formData.set("email", "ana@example.com")
  formData.set("notes", "sin cebolla")
  formData.set("fulfillmentType", overrides?.fulfillmentType ?? "pickup")
  formData.set("paymentMethod", overrides?.paymentMethod ?? "mobile_payment")
  formData.set(
    "items",
    overrides?.items ?? JSON.stringify([{ id: "item-1", productId: "product-1", tenantSlug: "demo-brand", branchId: "branch-1", name: "Burger", description: "", category: "Burgers", unitPrice: 8.5, unitPriceLabel: "$ 8.50", quantity: 1, modifierSelections: [] }])
  )

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

function createCheckoutRequest(formData: FormData) {
  return {
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request
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
              limit: vi.fn(() => ({
                maybeSingle,
              })),
            })),
          })),
        }
      }

      if (table === "orders") {
        return {
          delete: vi.fn(() => ({
            eq: deleteEq,
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
    storage: {
      from: vi.fn(() => ({
        upload,
        remove,
      })),
    },
  }

  return { adminClient, upload, remove, deleteEq, maybeSingle }
}

describe("POST /api/storefront/[tenantSlug]/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getCustomerAccountContext.mockResolvedValue({
      customer: {
        id: "customer-1",
        fullName: "Ana Perez",
      },
      profile: {
        id: "profile-1",
        fullName: "Ana Perez",
      },
    })

    getFileExtension.mockReturnValue("png")
    getPaymentProofsBucket.mockReturnValue("payment-proofs")
    buildPaymentProofImagePath.mockReturnValue("tenants/tenant-1/orders/order-1/payment-proof/receipt.png")
  })

  it("returns 500 when the Supabase admin client is unavailable", async () => {
    createSupabaseAdminClient.mockReturnValue(null)

    const response = await POST(
      createCheckoutRequest(createCheckoutFormData()),
      { params: Promise.resolve({ tenantSlug: "demo-brand" }) }
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Supabase admin client is not configured." })
  })

  it("requires an authenticated customer session", async () => {
    const { adminClient } = createAdminClient()
    createSupabaseAdminClient.mockReturnValue(adminClient)
    getCustomerAccountContext.mockResolvedValue(null)

    const response = await POST(
      createCheckoutRequest(createCheckoutFormData()),
      { params: Promise.resolve({ tenantSlug: "demo-brand" }) }
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Inicia sesión para continuar con el checkout." })
  })

  it("rejects invalid payment methods", async () => {
    const { adminClient } = createAdminClient()
    createSupabaseAdminClient.mockReturnValue(adminClient)

    const response = await POST(
      createCheckoutRequest(createCheckoutFormData({ paymentMethod: "cash" })),
      { params: Promise.resolve({ tenantSlug: "demo-brand" }) }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Selecciona un método de pago válido para continuar." })
  })

  it("rolls back the order when payment proof upload fails", async () => {
    const { adminClient, upload, deleteEq, maybeSingle } = createAdminClient()
    createSupabaseAdminClient.mockReturnValue(adminClient)
    createStorefrontOrder.mockResolvedValue({ ok: true, orderId: "order-1", orderNumber: 123 })
    maybeSingle.mockResolvedValue({ error: null, data: { id: "tenant-1" } })
    upload.mockResolvedValue({ error: { message: "storage failed" } })
    deleteEq.mockResolvedValue({ error: null })

    const response = await POST(
      createCheckoutRequest(createCheckoutFormData()),
      { params: Promise.resolve({ tenantSlug: "demo-brand" }) }
    )

    expect(deleteEq).toHaveBeenCalledWith("id", "order-1")
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "storage failed" })
  })

  it("removes the uploaded proof and rolls back the order when receipt attachment fails", async () => {
    const { adminClient, upload, remove, deleteEq, maybeSingle } = createAdminClient()
    createSupabaseAdminClient.mockReturnValue(adminClient)
    createStorefrontOrder.mockResolvedValue({ ok: true, orderId: "order-1", orderNumber: 123 })
    maybeSingle.mockResolvedValue({ error: null, data: { id: "tenant-1" } })
    upload.mockResolvedValue({ error: null })
    attachManualPaymentReceipt.mockResolvedValue({ ok: false, error: "attach failed" })
    remove.mockResolvedValue({ error: null })
    deleteEq.mockResolvedValue({ error: null })

    const response = await POST(
      createCheckoutRequest(createCheckoutFormData()),
      { params: Promise.resolve({ tenantSlug: "demo-brand" }) }
    )

    expect(remove).toHaveBeenCalledWith(["tenants/tenant-1/orders/order-1/payment-proof/receipt.png"])
    expect(deleteEq).toHaveBeenCalledWith("id", "order-1")
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "attach failed" })
  })

  it("creates the order, uploads the proof, attaches it and clears the bag on success", async () => {
    const { adminClient, upload, maybeSingle } = createAdminClient()
    createSupabaseAdminClient.mockReturnValue(adminClient)
    createStorefrontOrder.mockResolvedValue({ ok: true, orderId: "order-1", orderNumber: 123 })
    maybeSingle.mockResolvedValue({ error: null, data: { id: "tenant-1" } })
    upload.mockResolvedValue({ error: null })
    attachManualPaymentReceipt.mockResolvedValue({ ok: true })
    clearCustomerBranchBag.mockResolvedValue(undefined)

    const response = await POST(
      createCheckoutRequest(createCheckoutFormData()),
      { params: Promise.resolve({ tenantSlug: "demo-brand" }) }
    )

    expect(createStorefrontOrder).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        tenantSlug: "demo-brand",
        branchId: "branch-1",
        customerId: "customer-1",
        fulfillmentType: "pickup",
        customer: {
          fullName: "Ana Perez",
          phone: "+584141234567",
          email: "ana@example.com",
          notes: "sin cebolla",
        },
        auditActor: expect.objectContaining({
          surface: "storefront",
          profileId: "profile-1",
          name: "Ana Perez",
        }),
      })
    )
    expect(attachManualPaymentReceipt).toHaveBeenCalledWith(
      adminClient,
      "order-1",
      expect.objectContaining({
        paymentMethod: "mobile_payment",
        receiptImagePath: "tenants/tenant-1/orders/order-1/payment-proof/receipt.png",
      })
    )
    expect(clearCustomerBranchBag).toHaveBeenCalledWith(adminClient, {
      tenantSlug: "demo-brand",
      branchId: "branch-1",
      customerId: "customer-1",
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, orderId: "order-1", orderNumber: 123 })
  })
})
