import { describe, expect, it } from "vitest"

import {
  fromCatalogDbStatus,
  fromCatalogDbVisibility,
  normalizeCatalogPrice,
  slugifyCatalogValue,
  toCatalogDbStatus,
  toCatalogDbVisibility,
} from "@/lib/domain/catalog"

describe("normalizeCatalogPrice", () => {
  it("normalizes formatted currency strings", () => {
    expect(normalizeCatalogPrice("123.456")).toBe(123.46)
  })

  it("rejects zero and negative values", () => {
    expect(normalizeCatalogPrice("0")).toBeNull()
    expect(normalizeCatalogPrice("-5")).toBeNull()
  })

  it("rejects invalid numeric input", () => {
    expect(normalizeCatalogPrice("abc")).toBeNull()
  })
})

describe("slugifyCatalogValue", () => {
  it("removes accents, trims spaces and joins words with hyphens", () => {
    expect(slugifyCatalogValue("  Menu del dia  ")).toBe("menu-del-dia")
  })

  it("collapses non alphanumeric separators", () => {
    expect(slugifyCatalogValue("Hamburguesa / Doble + Queso")).toBe("hamburguesa-doble-queso")
  })
})

describe("catalog status mapping", () => {
  it("maps ui status to db status", () => {
    expect(toCatalogDbStatus("Activo")).toBe("active")
    expect(toCatalogDbStatus("Draft")).toBe("draft")
  })

  it("maps db status back to ui status", () => {
    expect(fromCatalogDbStatus("active")).toBe("Activo")
    expect(fromCatalogDbStatus("draft")).toBe("Draft")
  })
})

describe("catalog visibility mapping", () => {
  it("maps public visibility to true", () => {
    expect(toCatalogDbVisibility("Publica")).toBe(true)
  })

  it("maps hidden visibility to false", () => {
    expect(toCatalogDbVisibility("Oculta")).toBe(false)
  })

  it("maps db visibility back to ui labels", () => {
    expect(fromCatalogDbVisibility(true)).toBe("Publica")
    expect(fromCatalogDbVisibility(false)).toBe("Oculta")
  })
})
