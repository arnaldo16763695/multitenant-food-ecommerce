type DisplayableModifierSelection = {
  readonly modifierGroupName: string
  readonly modifierOptionName: string
  readonly modifierKind: "ingredient" | "addon" | "choice"
}

// "ingredient" groups render as an exclusion list (defaults included, tap to remove) across the
// storefront, bag, checkout, kitchen board and order history. This used to be inferred from the
// group's display name; it's now driven by the explicit modifier_kind set in catalog admin, kept
// in sync with mobile (see 20260803132636_storefront_modifier_contract_semantics.sql).
export function isExclusionGroup(modifierKind: "ingredient" | "addon" | "choice") {
  return modifierKind === "ingredient"
}

export function formatModifierGroupTitle(groupName: string, modifierKind: "ingredient" | "addon" | "choice") {
  if (!isExclusionGroup(modifierKind)) {
    return groupName
  }

  return "Quitar ingredientes"
}

export function formatExclusionAction(optionName: string) {
  return `Sin ${optionName.toLowerCase()}`
}

export function formatModifierSelectionLabel(selection: DisplayableModifierSelection) {
  if (isExclusionGroup(selection.modifierKind)) {
    return formatExclusionAction(selection.modifierOptionName)
  }

  return `${formatModifierGroupTitle(selection.modifierGroupName, selection.modifierKind)}: ${selection.modifierOptionName}`
}
