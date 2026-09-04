import { describe, expect, it } from "vitest"

import type { ShoppingBagModifierSelection } from "@/lib/domain/bag"
import { buildConfigurationHash, isComboComponentsAvailable, validateModifierSelections } from "@/lib/services/customer-bag"

function createSelection(overrides: Partial<ShoppingBagModifierSelection> = {}): ShoppingBagModifierSelection {
  return {
    modifierGroupId: "group-1",
    modifierGroupName: "Salsas",
    modifierKind: "choice",
    modifierOptionId: "option-1",
    modifierOptionName: "Mayonesa",
    priceDelta: 1,
    priceDeltaLabel: "$ 1.00",
    ...overrides,
  }
}

describe("buildConfigurationHash", () => {
  it("sorts selections so the hash is stable regardless of input order", () => {
    const hash = buildConfigurationHash([
      createSelection({ modifierGroupId: "group-2", modifierOptionId: "option-2" }),
      createSelection({ modifierGroupId: "group-1", modifierOptionId: "option-3" }),
    ])

    expect(hash).toBe("group-1:option-3|group-2:option-2")
  })
})

describe("validateModifierSelections", () => {
  const modifierGroupMap = new Map([
    [
      "group-1",
      {
        id: "group-1",
        name: "Salsas",
        selection_type: "single" as const,
        min_select: 1,
        max_select: 1,
      },
    ],
    [
      "group-2",
      {
        id: "group-2",
        name: "Extras",
        selection_type: "multiple" as const,
        min_select: 0,
        max_select: 2,
      },
    ],
  ])

  const modifierGroupOptionsMap = new Map([
    [
      "group-1",
      [
        { id: "option-1", modifier_group_id: "group-1", name: "Mayonesa", price_delta: 1, is_active: true },
        { id: "option-2", modifier_group_id: "group-1", name: "Mostaza", price_delta: 1, is_active: true },
      ],
    ],
    [
      "group-2",
      [{ id: "option-3", modifier_group_id: "group-2", name: "Queso", price_delta: 2, is_active: true }],
    ],
  ])

  it("rejects selections for groups that no longer exist", () => {
    const result = validateModifierSelections(
      [createSelection({ modifierGroupId: "missing-group", modifierGroupName: "Otro" })],
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "Uno de los grupos seleccionados ya no existe para este producto." })
  })

  it("rejects multiple selections in single choice groups", () => {
    const result = validateModifierSelections(
      [
        createSelection({ modifierOptionId: "option-1" }),
        createSelection({ modifierOptionId: "option-2", modifierOptionName: "Mostaza" }),
      ],
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "Solo puedes elegir una opcion en Salsas." })
  })

  it("rejects unavailable options", () => {
    const result = validateModifierSelections(
      [createSelection({ modifierOptionId: "missing-option", modifierOptionName: "Picante" })],
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "La opcion Picante ya no esta disponible." })
  })

  it("enforces required groups even when no selection was sent", () => {
    const result = validateModifierSelections([], modifierGroupMap, modifierGroupOptionsMap)

    expect(result).toEqual({ ok: false, error: "Debes completar la seleccion requerida en Salsas." })
  })

  it("accepts valid selections that satisfy group rules", () => {
    const result = validateModifierSelections(
      [
        createSelection({ modifierGroupId: "group-1", modifierOptionId: "option-1" }),
        createSelection({
          modifierGroupId: "group-2",
          modifierGroupName: "Extras",
          modifierOptionId: "option-3",
          modifierOptionName: "Queso",
          priceDelta: 2,
          priceDeltaLabel: "$ 2.00",
        }),
      ],
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: true })
  })
})

describe("isComboComponentsAvailable", () => {
  const comboComponentsMap = new Map([
    [
      "combo-1",
      [
        { combo_product_id: "combo-1", component_product_id: "product-burger", component_variant_id: null },
        { combo_product_id: "combo-1", component_product_id: "product-soda", component_variant_id: "variant-soda-1l" },
      ],
    ],
  ])

  it("is available when a combo has no component rows at all", () => {
    expect(isComboComponentsAvailable("combo-without-components", comboComponentsMap, new Map(), new Map())).toBe(true)
  })

  it("is available when no component has an override row (opt-out availability model)", () => {
    expect(isComboComponentsAvailable("combo-1", comboComponentsMap, new Map(), new Map())).toBe(true)
  })

  it("is unavailable when a variant-less component's own override says paused", () => {
    const branchOverrideMap = new Map([["product-burger", { product_id: "product-burger", availability_status: "paused" as const, price_override: null }]])

    expect(isComboComponentsAvailable("combo-1", comboComponentsMap, branchOverrideMap, new Map())).toBe(false)
  })

  it("is unavailable when a component that specifies a variant has that variant paused", () => {
    const branchVariantOverrideMap = new Map([
      ["variant-soda-1l", { product_variant_id: "variant-soda-1l", availability_status: "out_of_stock" as const, price_override: null }],
    ])

    expect(isComboComponentsAvailable("combo-1", comboComponentsMap, new Map(), branchVariantOverrideMap)).toBe(false)
  })

  it("is available only once every component individually resolves available", () => {
    const branchOverrideMap = new Map([["product-burger", { product_id: "product-burger", availability_status: "available" as const, price_override: null }]])
    const branchVariantOverrideMap = new Map([
      ["variant-soda-1l", { product_variant_id: "variant-soda-1l", availability_status: "available" as const, price_override: null }],
    ])

    expect(isComboComponentsAvailable("combo-1", comboComponentsMap, branchOverrideMap, branchVariantOverrideMap)).toBe(true)
  })
})
