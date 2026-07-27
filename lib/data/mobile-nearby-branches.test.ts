import { describe, expect, it } from "vitest"

import { haversineDistanceMeters } from "@/lib/data/mobile-nearby-branches"

describe("haversineDistanceMeters", () => {
  it("returns zero for the same coordinates", () => {
    expect(haversineDistanceMeters({ latitude: 10, longitude: -66 }, { latitude: 10, longitude: -66 })).toBe(0)
  })

  it("is symmetric between origin and destination", () => {
    const from = { latitude: 10.4806, longitude: -66.9036 }
    const to = { latitude: 10.6545, longitude: -71.6406 }

    expect(haversineDistanceMeters(from, to)).toBeCloseTo(haversineDistanceMeters(to, from), 8)
  })

  it("returns a realistic distance for separated cities", () => {
    const distance = haversineDistanceMeters(
      { latitude: 10.4806, longitude: -66.9036 },
      { latitude: 10.6545, longitude: -71.6406 }
    )

    expect(distance).toBeGreaterThan(500000)
    expect(distance).toBeLessThan(550000)
  })
})
