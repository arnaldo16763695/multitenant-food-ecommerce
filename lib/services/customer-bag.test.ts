import { describe, expect, it } from "vitest"

import type { ShoppingBagModifierSelection } from "@/lib/domain/bag"
import { buildConfigurationHash, validateModifierSelections } from "@/lib/services/customer-bag"

function createSelection(overrides: Partial<ShoppingBagModifierSelection> = {}): ShoppingBagModifierSelection {
  return {
    modifierGroupId: "group-1",
    modifierGroupName: "Salsas",
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
