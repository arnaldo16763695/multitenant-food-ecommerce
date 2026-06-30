import type { ShoppingBagModifierSelection } from "@/lib/domain/bag"

export function isExclusionGroup(groupName: string) {
  const normalizedName = groupName.trim().toLowerCase()
  return normalizedName.includes("exclusion") || normalizedName.includes("exclusión")
}

export function formatModifierGroupTitle(groupName: string) {
  if (!isExclusionGroup(groupName)) {
    return groupName
  }

  return "Quitar ingredientes"
}

export function formatExclusionAction(optionName: string) {
  return `Sin ${optionName.toLowerCase()}`
}

export function formatModifierSelectionLabel(selection: Pick<ShoppingBagModifierSelection, "modifierGroupName" | "modifierOptionName">) {
  if (isExclusionGroup(selection.modifierGroupName)) {
    return formatExclusionAction(selection.modifierOptionName)
  }

  return `${formatModifierGroupTitle(selection.modifierGroupName)}: ${selection.modifierOptionName}`
}
