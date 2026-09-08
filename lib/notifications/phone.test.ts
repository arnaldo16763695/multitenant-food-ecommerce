import { describe, expect, it } from "vitest"

import { normalizeVenezuelaPhone } from "@/lib/notifications/phone"

describe("normalizeVenezuelaPhone", () => {
  it("keeps an already country-coded number", () => {
    expect(normalizeVenezuelaPhone("584121234567")).toBe("584121234567")
    expect(normalizeVenezuelaPhone("+58 412 123 4567")).toBe("584121234567")
  })

  it("converts a national number with the trunk 0", () => {
    expect(normalizeVenezuelaPhone("04121234567")).toBe("584121234567")
    expect(normalizeVenezuelaPhone("0412-123-4567")).toBe("584121234567")
  })

  it("converts a bare 10-digit national number", () => {
    expect(normalizeVenezuelaPhone("4121234567")).toBe("584121234567")
  })

  it("returns null for anything it cannot confidently normalize", () => {
    expect(normalizeVenezuelaPhone(null)).toBeNull()
    expect(normalizeVenezuelaPhone("")).toBeNull()
    expect(normalizeVenezuelaPhone("123")).toBeNull()
    expect(normalizeVenezuelaPhone("no tengo")).toBeNull()
    expect(normalizeVenezuelaPhone("12345678901234")).toBeNull()
  })
})
