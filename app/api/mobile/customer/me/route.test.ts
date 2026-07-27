import { beforeEach, describe, expect, it, vi } from "vitest"

const { authenticateMobileCustomerRequest } = vi.hoisted(() => ({
  authenticateMobileCustomerRequest: vi.fn(),
}))

vi.mock("@/lib/mobile/customer", () => ({
  authenticateMobileCustomerRequest,
}))

import { GET } from "@/app/api/mobile/customer/me/route"

describe("GET /api/mobile/customer/me", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns auth failures from the mobile auth layer", async () => {
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Customer is not authenticated.",
    })

    const response = await GET(new Request("https://example.com/api/mobile/customer/me"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Customer is not authenticated." })
  })

  it("returns the authenticated customer context", async () => {
    authenticateMobileCustomerRequest.mockResolvedValue({
      ok: true,
      adminClient: { kind: "admin" },
      customerContext: {
        customer: { id: "customer-1", fullName: "Ana Perez" },
        profile: { id: "profile-1", fullName: "Ana Perez" },
      },
    })

    const response = await GET(new Request("https://example.com/api/mobile/customer/me"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      customer: {
        customer: { id: "customer-1", fullName: "Ana Perez" },
        profile: { id: "profile-1", fullName: "Ana Perez" },
      },
    })
  })
})
