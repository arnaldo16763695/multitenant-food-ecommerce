import { describe, expect, it } from "vitest"

import { describeModifierSelectionChange } from "./modifier-display"

function selection(overrides: Partial<Parameters<typeof describeModifierSelectionChange>[0][number]> = {}) {
  return {
    modifierGroupId: "group-1",
    modifierGroupName: "Ingredientes",
    modifierOptionName: "Cebolla",
    modifierOptionId: "option-1",
    modifierKind: "ingredient" as const,
    ...overrides,
  }
}

describe("describeModifierSelectionChange", () => {
  it("returns null when there is no difference from the baseline", () => {
    const baseline = [selection()]
    const current = [selection()]

    expect(describeModifierSelectionChange(baseline, current)).toBeNull()
  })

  it("returns the label of the single added selection", () => {
    const baseline: ReturnType<typeof selection>[] = []
    const current = [selection({ modifierOptionName: "Cebolla" })]

    expect(describeModifierSelectionChange(baseline, current)).toBe("Sin cebolla")
  })

  it("returns the label of the single removed selection", () => {
    const baseline = [selection({ modifierOptionName: "Cebolla" })]
    const current: ReturnType<typeof selection>[] = []

    expect(describeModifierSelectionChange(baseline, current)).toBe("Sin cebolla")
  })

  it("returns null when more than one selection differs", () => {
    const baseline = [selection({ modifierOptionId: "option-1", modifierOptionName: "Cebolla" })]
    const current = [
      selection({ modifierOptionId: "option-2", modifierOptionName: "Mostaza", modifierKind: "addon" }),
      selection({ modifierOptionId: "option-3", modifierOptionName: "Queso extra", modifierKind: "addon" }),
    ]

    expect(describeModifierSelectionChange(baseline, current)).toBeNull()
  })

  it("uses the group/option name label for non-exclusion modifier kinds", () => {
    const baseline: ReturnType<typeof selection>[] = []
    const current = [selection({ modifierGroupName: "Extras", modifierOptionName: "Queso extra", modifierKind: "addon" })]

    expect(describeModifierSelectionChange(baseline, current)).toBe("Extras: Queso extra")
  })
})
