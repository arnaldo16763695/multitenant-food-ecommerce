import { beforeEach, describe, expect, it, vi } from "vitest"

const { getNearbyBranches } = vi.hoisted(() => ({
  getNearbyBranches: vi.fn(),
}))

vi.mock("@/lib/data/mobile-nearby-branches", () => ({
  getNearbyBranches,
}))

import { GET } from "@/app/api/mobile/branches/nearby/route"

describe("GET /api/mobile/branches/nearby", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires lat", async () => {
    const response = await GET(new Request("https://example.com/api/mobile/branches/nearby?lng=-66.9"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "lat is required." })
    expect(getNearbyBranches).not.toHaveBeenCalled()
  })

  it("requires numeric lng", async () => {
    const response = await GET(new Request("https://example.com/api/mobile/branches/nearby?lat=10.4&lng=abc"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "lng must be a valid number." })
    expect(getNearbyBranches).not.toHaveBeenCalled()
  })

  it("requires positive limit when provided", async () => {
    const response = await GET(new Request("https://example.com/api/mobile/branches/nearby?lat=10.4&lng=-66.9&limit=0"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "limit must be a positive number." })
    expect(getNearbyBranches).not.toHaveBeenCalled()
  })

  it("passes parsed coordinates and limit to the data layer", async () => {
    getNearbyBranches.mockResolvedValue([
      { id: "branch-1", name: "Sucursal Centro" },
      { id: "branch-2", name: "Sucursal Este" },
    ])

    const response = await GET(new Request("https://example.com/api/mobile/branches/nearby?lat=10.4&lng=-66.9&limit=5"))

    expect(getNearbyBranches).toHaveBeenCalledWith({
      latitude: 10.4,
      longitude: -66.9,
      limit: 5,
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      branches: [
        { id: "branch-1", name: "Sucursal Centro" },
        { id: "branch-2", name: "Sucursal Este" },
      ],
    })
  })
})
