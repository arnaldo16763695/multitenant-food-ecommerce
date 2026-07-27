import { beforeEach, describe, expect, it, vi } from "vitest"

const { authenticateMobileCustomerRequest, addCustomerBagItem } = vi.hoisted(() => ({
  authenticateMobileCustomerRequest: vi.fn(),
  addCustomerBagItem: vi.fn(),
}))

vi.mock("@/lib/mobile/customer", () => ({
  authenticateMobileCustomerRequest,
}))

vi.mock("@/lib/services/customer-bag", () => ({
  addCustomerBagItem,
}))

import { POST } from "@/app/api/mobile/storefront/[tenantSlug]/bag/items/route"

describe("POST /api/mobile/storefront/[tenantSlug]/bag/items", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns auth failures from the mobile auth layer", async () => {
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Missing Bearer token.",
    })

    const response = await POST(new Request("https://example.com", { method: "POST", body: JSON.stringify({}) }), {
      params: Promise.resolve({ tenantSlug: "burger-house" }),
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Missing Bearer token." })
    expect(addCustomerBagItem).not.toHaveBeenCalled()
  })

  it("rejects requests without branchId or productId", async () => {
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient: { kind: "admin" },
      customerContext: { customer: { id: "customer-1" } },
    })

    const response = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ branchId: "", productId: "product-1" }),
      }),
      { params: Promise.resolve({ tenantSlug: "burger-house" }) }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "branchId and productId are required." })
    expect(addCustomerBagItem).not.toHaveBeenCalled()
  })

  it("rejects invalid modifierSelections payloads", async () => {
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient: { kind: "admin" },
      customerContext: { customer: { id: "customer-1" } },
    })

    const response = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          branchId: "branch-1",
          productId: "product-1",
          modifierSelections: { invalid: true },
        }),
      }),
      { params: Promise.resolve({ tenantSlug: "burger-house" }) }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "modifierSelections must be a valid array." })
    expect(addCustomerBagItem).not.toHaveBeenCalled()
  })

  it("passes normalized payload data to the bag service", async () => {
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient: { kind: "admin" },
      customerContext: { customer: { id: "customer-1" } },
    })
    addCustomerBagItem.mockResolvedValue({ ok: true, quantity: 2 })

    const response = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          branchId: " branch-1 ",
          productId: " product-1 ",
          productVariantId: " variant-1 ",
          quantity: 2,
          modifierSelections: [
            {
              modifierGroupId: "group-1",
              modifierGroupName: "Salsas",
              modifierOptionId: "option-1",
              modifierOptionName: "Mayonesa",
              priceDelta: 1.5,
            },
          ],
        }),
      }),
      { params: Promise.resolve({ tenantSlug: "burger-house" }) }
    )

    expect(addCustomerBagItem).toHaveBeenCalledWith(
      { kind: "admin" },
      {
        tenantSlug: "burger-house",
        branchId: "branch-1",
        customerId: "customer-1",
        productId: "product-1",
        productVariantId: "variant-1",
        quantity: 2,
        modifierSelections: [
          {
            modifierGroupId: "group-1",
            modifierGroupName: "Salsas",
            modifierOptionId: "option-1",
            modifierOptionName: "Mayonesa",
            priceDelta: 1.5,
            priceDeltaLabel: "$ 1.50",
          },
        ],
      }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, quantity: 2 })
  })

  it("returns service validation errors as 400 responses", async () => {
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient: { kind: "admin" },
      customerContext: { customer: { id: "customer-1" } },
    })
    addCustomerBagItem.mockResolvedValue({ ok: false, error: "Producto no disponible." })

    const response = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ branchId: "branch-1", productId: "product-1" }),
      }),
      { params: Promise.resolve({ tenantSlug: "burger-house" }) }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Producto no disponible." })
  })
})
