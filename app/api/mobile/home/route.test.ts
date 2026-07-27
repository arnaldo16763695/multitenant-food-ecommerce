import { beforeEach, describe, expect, it, vi } from "vitest"

const { getMobileHome } = vi.hoisted(() => ({
  getMobileHome: vi.fn(),
}))

vi.mock("@/lib/data/mobile-home", () => ({
  getMobileHome,
}))

import { GET } from "@/app/api/mobile/home/route"

describe("GET /api/mobile/home", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires lat and lng together", async () => {
    const response = await GET(new Request("https://example.com/api/mobile/home?lat=10.4"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "lat and lng must be provided together." })
    expect(getMobileHome).not.toHaveBeenCalled()
  })

  it("rejects invalid coordinates", async () => {
    const response = await GET(new Request("https://example.com/api/mobile/home?lat=abc&lng=-66.9"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "lat must be a valid number." })
    expect(getMobileHome).not.toHaveBeenCalled()
  })

  it("allows requests without coordinates", async () => {
    getMobileHome.mockResolvedValue({ featured: [] })

    const response = await GET(new Request("https://example.com/api/mobile/home"))

    expect(getMobileHome).toHaveBeenCalledWith({ latitude: undefined, longitude: undefined })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ featured: [] })
  })

  it("passes parsed coordinates to the data layer", async () => {
    getMobileHome.mockResolvedValue({ featured: [{ id: "tenant-1" }] })

    const response = await GET(new Request("https://example.com/api/mobile/home?lat=10.4&lng=-66.9"))

    expect(getMobileHome).toHaveBeenCalledWith({ latitude: 10.4, longitude: -66.9 })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ featured: [{ id: "tenant-1" }] })
  })
})
