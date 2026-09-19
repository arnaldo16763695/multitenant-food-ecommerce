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

type IdentifiableModifierSelection = DisplayableModifierSelection & {
  readonly modifierGroupId: string
  readonly modifierOptionId: string
}

function modifierSelectionKey(selection: IdentifiableModifierSelection) {
  return `${selection.modifierGroupId}:${selection.modifierOptionId}`
}

// Used by the bag-split prompt to phrase its question around the one modifier the customer just
// touched (e.g. `Sin cebolla`) instead of generic copy. Returns a label only when exactly one
// selection differs from the baseline -- if the customer changed multiple modifiers at once, the
// caller should fall back to generic "tu personalización" copy rather than naming just one of them.
export function describeModifierSelectionChange(
  baselineSelections: readonly IdentifiableModifierSelection[],
  currentSelections: readonly IdentifiableModifierSelection[]
): string | null {
  const baselineKeys = new Set(baselineSelections.map(modifierSelectionKey))
  const currentKeys = new Set(currentSelections.map(modifierSelectionKey))

  const added = currentSelections.filter((selection) => !baselineKeys.has(modifierSelectionKey(selection)))
  const removed = baselineSelections.filter((selection) => !currentKeys.has(modifierSelectionKey(selection)))
  const changed = [...added, ...removed]

  if (changed.length !== 1) {
    return null
  }

  return formatModifierSelectionLabel(changed[0])
}
