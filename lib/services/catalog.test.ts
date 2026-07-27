import { describe, expect, it } from "vitest"

import { normalizeModifierGroupOptions, normalizePrepTimeMinutes, normalizeVariantInputs } from "@/lib/services/catalog"

describe("normalizeVariantInputs", () => {
  it("returns an empty list when no variants are provided", () => {
    expect(normalizeVariantInputs()).toEqual({ ok: true, variants: [] })
  })

  it("normalizes, trims and preserves a single default variant", () => {
    const result = normalizeVariantInputs([
      { name: "  Pequena ", basePrice: "10.499", isDefault: true, sortOrder: 3 },
      { name: "Grande", basePrice: "12", isDefault: false, sortOrder: 4 },
    ])

    expect(result).toEqual({
      ok: true,
      variants: [
        { id: undefined, name: "Pequena", basePrice: 10.5, isDefault: true, sortOrder: 3 },
        { id: undefined, name: "Grande", basePrice: 12, isDefault: false, sortOrder: 4 },
      ],
    })
  })

  it("rejects variant lists without exactly one default", () => {
    const result = normalizeVariantInputs([
      { name: "Pequena", basePrice: "10", isDefault: false, sortOrder: 0 },
      { name: "Grande", basePrice: "12", isDefault: false, sortOrder: 1 },
    ])

    expect(result).toEqual({ ok: false, error: "Define exactamente una variante predeterminada." })
  })

  it("rejects duplicate names case-insensitively", () => {
    const result = normalizeVariantInputs([
      { name: "Grande", basePrice: "10", isDefault: true, sortOrder: 0 },
      { name: "grande", basePrice: "12", isDefault: false, sortOrder: 1 },
    ])

    expect(result).toEqual({ ok: false, error: "Las variantes no pueden repetir nombre." })
  })
})

describe("normalizePrepTimeMinutes", () => {
  it("returns null for blank or invalid values", () => {
    expect(normalizePrepTimeMinutes("")).toBeNull()
    expect(normalizePrepTimeMinutes("0")).toBeNull()
    expect(normalizePrepTimeMinutes("abc")).toBeNull()
  })

  it("rounds valid positive values", () => {
    expect(normalizePrepTimeMinutes("12.6")).toBe(13)
  })
})

describe("normalizeModifierGroupOptions", () => {
  it("normalizes option names and invalid prices to zero", () => {
    const result = normalizeModifierGroupOptions([
      { name: "  Picante ", priceDelta: "abc", sortOrder: 2 },
      { name: "Queso", priceDelta: "2.349", sortOrder: 3 },
    ])

    expect(result).toEqual({
      ok: true,
      options: [
        { id: undefined, name: "Picante", priceDelta: 0, sortOrder: 2 },
        { id: undefined, name: "Queso", priceDelta: 2.35, sortOrder: 3 },
      ],
    })
  })

  it("rejects duplicate option names case-insensitively", () => {
    const result = normalizeModifierGroupOptions([
      { name: "Queso", priceDelta: "1", sortOrder: 0 },
      { name: "queso", priceDelta: "2", sortOrder: 1 },
    ])

    expect(result).toEqual({ ok: false, error: "Las opciones del modificador no pueden repetir nombre." })
  })
})
