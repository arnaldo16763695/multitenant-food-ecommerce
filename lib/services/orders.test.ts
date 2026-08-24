import { describe, expect, it } from "vitest"

import type { CheckoutBagItemModifierInput } from "@/lib/domain/order"
import { validateAndPriceItemModifiers } from "@/lib/services/orders"

function createSelection(overrides: Partial<CheckoutBagItemModifierInput> = {}): CheckoutBagItemModifierInput {
  return {
    modifierGroupId: "group-1",
    modifierGroupName: "Salsas",
    modifierOptionId: "option-1",
    modifierOptionName: "Mayonesa",
    priceDelta: 1,
    ...overrides,
  }
}

describe("validateAndPriceItemModifiers", () => {
  const allowedGroupIds = new Set(["group-1", "group-2"])

  const modifierGroupMap = new Map([
    [
      "group-1",
      {
        id: "group-1",
        name: "Salsas",
        selection_type: "single" as const,
        modifier_kind: "choice" as const,
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
        modifier_kind: "addon" as const,
        min_select: 0,
        max_select: 2,
      },
    ],
  ])

  const modifierGroupOptionsMap = new Map([
    [
      "group-1",
      [
        { id: "option-1", modifier_group_id: "group-1", price_delta: 1.5 },
        { id: "option-2", modifier_group_id: "group-1", price_delta: 0 },
      ],
    ],
    ["group-2", [{ id: "option-3", modifier_group_id: "group-2", price_delta: 2 }]],
  ])

  it("rejects selections for groups the product does not actually allow", () => {
    const result = validateAndPriceItemModifiers(
      [createSelection({ modifierGroupId: "group-3", modifierGroupName: "Otro" })],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "Uno de los modificadores seleccionados ya no está disponible para este producto." })
  })

  it("rejects selections for an allowed group id that no longer resolves to a real group", () => {
    const result = validateAndPriceItemModifiers(
      [createSelection({ modifierGroupId: "group-missing", modifierGroupName: "Otro", modifierOptionId: "option-x", modifierOptionName: "X" })],
      new Set(["group-missing"]),
      new Map(),
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "Uno de los grupos de modificadores seleccionados ya no existe." })
  })

  it("rejects multiple selections in single-choice groups", () => {
    const result = validateAndPriceItemModifiers(
      [createSelection({ modifierOptionId: "option-1" }), createSelection({ modifierOptionId: "option-2", modifierOptionName: "Mostaza" })],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "Solo puedes elegir una opción en Salsas." })
  })

  it("rejects a selection count above the group's max_select", () => {
    const result = validateAndPriceItemModifiers(
      [
        createSelection({ modifierGroupId: "group-2", modifierGroupName: "Extras", modifierOptionId: "option-3", modifierOptionName: "Queso" }),
        createSelection({ modifierGroupId: "group-2", modifierGroupName: "Extras", modifierOptionId: "option-3", modifierOptionName: "Queso" }),
        createSelection({ modifierGroupId: "group-2", modifierGroupName: "Extras", modifierOptionId: "option-3", modifierOptionName: "Queso" }),
      ],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "La selección en Extras no cumple las reglas configuradas." })
  })

  it("rejects unavailable options", () => {
    const result = validateAndPriceItemModifiers(
      [createSelection({ modifierOptionId: "missing-option", modifierOptionName: "Picante" })],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "La opción Picante ya no está disponible." })
  })

  it("enforces required groups even when no selection was sent for them", () => {
    const result = validateAndPriceItemModifiers([], allowedGroupIds, modifierGroupMap, modifierGroupOptionsMap)

    expect(result).toEqual({ ok: false, error: "Debes completar la selección requerida en Salsas." })
  })

  it("re-prices from the server's own catalog and ignores a tampered client priceDelta", () => {
    const result = validateAndPriceItemModifiers(
      [createSelection({ priceDelta: 999999 })],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({
      ok: true,
      modifiers: [
        {
          modifier_group_name_snapshot: "Salsas",
          modifier_option_name_snapshot: "Mayonesa",
          modifier_kind_snapshot: "choice",
          price_snapshot: 1.5,
        },
      ],
    })
  })

  it("snapshots modifier_kind from the group's own catalog value", () => {
    const result = validateAndPriceItemModifiers(
      [
        createSelection({ modifierGroupId: "group-1", modifierOptionId: "option-1" }),
        createSelection({ modifierGroupId: "group-2", modifierGroupName: "Extras", modifierOptionId: "option-3", modifierOptionName: "Queso", priceDelta: 0 }),
      ],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({
      ok: true,
      modifiers: [
        {
          modifier_group_name_snapshot: "Salsas",
          modifier_option_name_snapshot: "Mayonesa",
          modifier_kind_snapshot: "choice",
          price_snapshot: 1.5,
        },
        {
          modifier_group_name_snapshot: "Extras",
          modifier_option_name_snapshot: "Queso",
          modifier_kind_snapshot: "addon",
          price_snapshot: 2,
        },
      ],
    })
  })

  it("accepts an item with no modifier selections when nothing is required", () => {
    const result = validateAndPriceItemModifiers(
      [],
      new Set(["group-2"]),
      new Map([["group-2", modifierGroupMap.get("group-2")!]]),
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: true, modifiers: [] })
  })
})
