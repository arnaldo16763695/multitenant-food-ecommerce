import type { SupabaseClient } from "@supabase/supabase-js"

import type { ShoppingBagItem, ShoppingBagModifierSelection, ShoppingBagMutationResult } from "@/lib/domain/bag"

type TenantRow = {
  id: string
}

type BranchRow = {
  id: string
}

type CustomerBagItemRow = {
  id: string
  product_id: string
  product_variant_id: string | null
  configuration_hash: string
  quantity: number
}

type CustomerBagItemModifierRow = {
  customer_bag_item_id: string
  price_delta_snapshot: number
  modifier_groups: {
    id: string
    name: string
  } | null
  modifier_group_options: {
    id: string
    name: string
  } | null
}

type ProductRow = {
  id: string
  name: string
  description: string
  base_price: number | string
  category_id: string | null
  status: "active" | "draft"
}

type ProductVariantRow = {
  id: string
  product_id: string
  name: string
  base_price: number | string
  is_active: boolean
}

type CategoryRow = {
  id: string
  name: string
}

type ModifierGroupRow = {
  id: string
  name: string
  selection_type: "single" | "multiple"
  min_select: number
  max_select: number
}

type ProductModifierGroupRow = {
  product_id: string
  modifier_group_id: string
}

type ModifierGroupOptionRow = {
  id: string
  modifier_group_id: string
  name: string
  price_delta: number | string
  is_active: boolean
}

type BranchProductOverrideRow = {
  product_id: string
  availability_status: "available" | "paused" | "out_of_stock"
  price_override: number | string | null
}

type BranchProductVariantOverrideRow = {
  product_variant_id: string
  availability_status: "available" | "paused" | "out_of_stock"
  price_override: number | string | null
}

type ResolvedBranchContext =
  | {
      readonly ok: true
      readonly tenantId: string
    }
  | {
      readonly ok: false
      readonly error: string
    }

function formatMoney(value: number | string) {
  return `$ ${Number(value).toFixed(2)}`
}

export function buildConfigurationHash(modifierSelections: readonly ShoppingBagModifierSelection[]) {
  return modifierSelections
    .map((selection) => `${selection.modifierGroupId}:${selection.modifierOptionId}`)
    .sort()
    .join("|")
}

async function resolveBranchContext(supabase: SupabaseClient, tenantSlug: string, branchId: string): Promise<ResolvedBranchContext> {
  const tenantResult = await supabase.from("tenants").select("id").eq("slug", tenantSlug).limit(1).maybeSingle<TenantRow>()

  if (tenantResult.error || !tenantResult.data) {
    return { ok: false, error: "No encontramos la marca asociada a la bolsa." }
  }

  const branchResult = await supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", tenantResult.data.id)
    .eq("id", branchId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<BranchRow>()

  if (branchResult.error || !branchResult.data) {
    return { ok: false, error: "No encontramos la sucursal activa para esta bolsa." }
  }

  return {
    ok: true,
    tenantId: tenantResult.data.id,
  }
}

async function loadBranchProductMaps(
  supabase: SupabaseClient,
  tenantId: string,
  branchId: string,
  productIds: readonly string[],
  variantIds: readonly string[] = []
) {
  if (!productIds.length && !variantIds.length) {
    return {
      productMap: new Map<string, ProductRow>(),
      productVariantMap: new Map<string, ProductVariantRow>(),
      categoryMap: new Map<string, string>(),
      branchOverrideMap: new Map<string, BranchProductOverrideRow>(),
      branchVariantOverrideMap: new Map<string, BranchProductVariantOverrideRow>(),
    }
  }

  const productsResult = await supabase
    .from("products")
    .select("id, name, description, base_price, category_id, status")
    .eq("tenant_id", tenantId)
    .in("id", [...productIds])
    .returns<ProductRow[]>()

  if (productsResult.error) {
    throw new Error(productsResult.error.message)
  }

  const products = productsResult.data ?? []
  const categoryIds = products.map((product) => product.category_id).filter((value): value is string => Boolean(value))

  const [productVariantsResult, categoriesResult, branchOverridesResult, branchVariantOverridesResult] = await Promise.all([
    variantIds.length
      ? supabase.from("product_variants").select("id, product_id, name, base_price, is_active").eq("tenant_id", tenantId).in("id", [...variantIds]).returns<ProductVariantRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: ProductVariantRow[]; error: null }),
    categoryIds.length
      ? supabase.from("categories").select("id, name").in("id", categoryIds).returns<CategoryRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: CategoryRow[]; error: null }),
    supabase
      .from("branch_product_overrides")
      .select("product_id, availability_status, price_override")
          .eq("branch_id", branchId)
          .in("product_id", [...productIds])
          .returns<BranchProductOverrideRow[]>(),
    variantIds.length
      ? supabase
          .from("branch_product_variant_overrides")
          .select("product_variant_id, availability_status, price_override")
          .eq("branch_id", branchId)
          .in("product_variant_id", [...variantIds])
          .returns<BranchProductVariantOverrideRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: BranchProductVariantOverrideRow[]; error: null }),
  ])

  if (productVariantsResult.error || categoriesResult.error || branchOverridesResult.error || branchVariantOverridesResult.error) {
    throw new Error(productVariantsResult.error?.message ?? categoriesResult.error?.message ?? branchOverridesResult.error?.message ?? branchVariantOverridesResult.error?.message ?? "No pudimos validar la bolsa.")
  }

  return {
    productMap: new Map(products.map((product) => [product.id, product])),
    productVariantMap: new Map((productVariantsResult.data ?? []).map((variant) => [variant.id, variant])),
    categoryMap: new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name])),
    branchOverrideMap: new Map((branchOverridesResult.data ?? []).map((override) => [override.product_id, override])),
    branchVariantOverrideMap: new Map((branchVariantOverridesResult.data ?? []).map((override) => [override.product_variant_id, override])),
  }
}

async function loadProductModifierConfiguration(supabase: SupabaseClient, tenantId: string, productId: string) {
  const [modifierGroupsResult, productModifierGroupsResult, modifierGroupOptionsResult] = await Promise.all([
    supabase.from("modifier_groups").select("id, name, selection_type, min_select, max_select").eq("tenant_id", tenantId).eq("is_active", true).returns<ModifierGroupRow[]>(),
    supabase.from("product_modifier_groups").select("product_id, modifier_group_id").eq("product_id", productId).returns<ProductModifierGroupRow[]>(),
    supabase.from("modifier_group_options").select("id, modifier_group_id, name, price_delta, is_active").eq("is_active", true).returns<ModifierGroupOptionRow[]>(),
  ])

  if (modifierGroupsResult.error || productModifierGroupsResult.error || modifierGroupOptionsResult.error) {
    throw new Error(modifierGroupsResult.error?.message ?? productModifierGroupsResult.error?.message ?? modifierGroupOptionsResult.error?.message ?? "No pudimos cargar los modificadores del producto.")
  }

  const allowedGroupIds = new Set((productModifierGroupsResult.data ?? []).map((relation) => relation.modifier_group_id))
  const modifierGroupMap = new Map((modifierGroupsResult.data ?? []).filter((group) => allowedGroupIds.has(group.id)).map((group) => [group.id, group]))
  const modifierGroupOptionsMap = (modifierGroupOptionsResult.data ?? []).reduce<Map<string, ModifierGroupOptionRow[]>>((map, option) => {
    if (!modifierGroupMap.has(option.modifier_group_id)) {
      return map
    }

    const currentOptions = map.get(option.modifier_group_id) ?? []
    map.set(option.modifier_group_id, [...currentOptions, option])
    return map
  }, new Map())

  return { modifierGroupMap, modifierGroupOptionsMap }
}

export function validateModifierSelections(
  modifierSelections: readonly ShoppingBagModifierSelection[],
  modifierGroupMap: ReadonlyMap<string, ModifierGroupRow>,
  modifierGroupOptionsMap: ReadonlyMap<string, readonly ModifierGroupOptionRow[]>
) {
  const selectionsByGroup = modifierSelections.reduce<Map<string, ShoppingBagModifierSelection[]>>((map, selection) => {
    const currentSelections = map.get(selection.modifierGroupId) ?? []
    map.set(selection.modifierGroupId, [...currentSelections, selection])
    return map
  }, new Map())

  for (const [groupId, selections] of selectionsByGroup) {
    const group = modifierGroupMap.get(groupId)

    if (!group) {
      return { ok: false as const, error: "Uno de los grupos seleccionados ya no existe para este producto." }
    }

    const allowedOptions = new Map((modifierGroupOptionsMap.get(groupId) ?? []).map((option) => [option.id, option]))

    if (group.selection_type === "single" && selections.length > 1) {
      return { ok: false as const, error: `Solo puedes elegir una opcion en ${group.name}.` }
    }

    if (selections.length < group.min_select || selections.length > group.max_select) {
      return { ok: false as const, error: `La seleccion en ${group.name} no cumple las reglas configuradas.` }
    }

    for (const selection of selections) {
      const option = allowedOptions.get(selection.modifierOptionId)

      if (!option) {
        return { ok: false as const, error: `La opcion ${selection.modifierOptionName} ya no esta disponible.` }
      }
    }
  }

  for (const group of modifierGroupMap.values()) {
    const selections = selectionsByGroup.get(group.id) ?? []

    if (selections.length < group.min_select) {
      return { ok: false as const, error: `Debes completar la seleccion requerida en ${group.name}.` }
    }
  }

  return { ok: true as const }
}

function buildBagItem(
  bagItemId: string,
  tenantSlug: string,
  branchId: string,
  quantity: number,
  product: ProductRow,
  productVariant: ProductVariantRow | null,
  categoryMap: ReadonlyMap<string, string>,
  branchOverrideMap: ReadonlyMap<string, BranchProductOverrideRow>,
  branchVariantOverrideMap: ReadonlyMap<string, BranchProductVariantOverrideRow>,
  modifierSelections: readonly ShoppingBagModifierSelection[] = []
): ShoppingBagItem | null {
  if (product.status !== "active") {
    return null
  }

  if (productVariant && (!productVariant.is_active || productVariant.product_id !== product.id)) {
    return null
  }

  const branchOverride = branchOverrideMap.get(product.id)
  const branchVariantOverride = productVariant ? branchVariantOverrideMap.get(productVariant.id) : null

  if (productVariant) {
    if (branchVariantOverride && branchVariantOverride.availability_status !== "available") {
      return null
    }
  } else if (branchOverride && branchOverride.availability_status !== "available") {
    return null
  }

  const baseUnitPrice = Number(productVariant ? branchVariantOverride?.price_override ?? productVariant.base_price : branchOverride?.price_override ?? product.base_price)
  const modifierDelta = modifierSelections.reduce((total, selection) => total + selection.priceDelta, 0)
  const unitPrice = Number((baseUnitPrice + modifierDelta).toFixed(2))

  return {
    id: bagItemId,
    productId: product.id,
    productVariantId: productVariant?.id ?? null,
    variantName: productVariant?.name ?? null,
    tenantSlug,
    branchId,
    name: productVariant ? `${product.name} · ${productVariant.name}` : product.name,
    description: product.description,
    category: product.category_id ? categoryMap.get(product.category_id) ?? "Menu" : "Menu",
    unitPrice,
    unitPriceLabel: formatMoney(unitPrice),
    quantity,
    modifierSelections,
  }
}

export async function getCustomerBagItems(
  supabase: SupabaseClient,
  tenantSlug: string,
  branchId: string,
  customerId: string
): Promise<readonly ShoppingBagItem[]> {
  const context = await resolveBranchContext(supabase, tenantSlug, branchId)

  if (!context.ok) {
    return []
  }

  const bagItemsResult = await supabase
    .from("customer_bag_items")
    .select("id, product_id, product_variant_id, configuration_hash, quantity")
    .eq("customer_id", customerId)
    .eq("tenant_id", context.tenantId)
    .eq("branch_id", branchId)
    .returns<CustomerBagItemRow[]>()

  if (bagItemsResult.error || !bagItemsResult.data?.length) {
    return []
  }

  const productIds = [...new Set(bagItemsResult.data.map((item) => item.product_id))]
  const variantIds = [...new Set(bagItemsResult.data.map((item) => item.product_variant_id).filter((value): value is string => Boolean(value)))]
  const { productMap, productVariantMap, categoryMap, branchOverrideMap, branchVariantOverrideMap } = await loadBranchProductMaps(supabase, context.tenantId, branchId, productIds, variantIds)
  const bagItemIds = bagItemsResult.data.map((item) => item.id)
  const bagItemModifiersResult = bagItemIds.length
    ? await supabase
        .from("customer_bag_item_modifiers")
        .select("customer_bag_item_id, price_delta_snapshot, modifier_groups(id, name), modifier_group_options(id, name)")
        .in("customer_bag_item_id", bagItemIds)
        .returns<CustomerBagItemModifierRow[]>()
    : { data: [], error: null }

  if (bagItemModifiersResult.error) {
    return []
  }

  const bagItemModifiersMap = (bagItemModifiersResult.data ?? []).reduce<Map<string, ShoppingBagModifierSelection[]>>((map, modifier) => {
    const currentModifiers = map.get(modifier.customer_bag_item_id) ?? []
    map.set(modifier.customer_bag_item_id, [
      ...currentModifiers,
      {
        modifierGroupId: modifier.modifier_groups?.id ?? "",
        modifierGroupName: modifier.modifier_groups?.name ?? "Grupo",
        modifierOptionId: modifier.modifier_group_options?.id ?? "",
        modifierOptionName: modifier.modifier_group_options?.name ?? "Opcion",
        priceDelta: Number(modifier.price_delta_snapshot),
        priceDeltaLabel: formatMoney(modifier.price_delta_snapshot),
      },
    ])
    return map
  }, new Map())

  return bagItemsResult.data.flatMap((item) => {
    const product = productMap.get(item.product_id)

    if (!product) {
      return []
    }

    const bagItem = buildBagItem(item.id, tenantSlug, branchId, item.quantity, product, item.product_variant_id ? productVariantMap.get(item.product_variant_id) ?? null : null, categoryMap, branchOverrideMap, branchVariantOverrideMap, bagItemModifiersMap.get(item.id) ?? [])

    return bagItem ? [bagItem] : []
  })
}

export async function addCustomerBagItem(
  supabase: SupabaseClient,
  input: {
    readonly bagItemId?: string
    readonly tenantSlug: string
    readonly branchId: string
    readonly customerId: string
    readonly productId: string
    readonly productVariantId?: string | null
    readonly quantity?: number
    readonly modifierSelections?: readonly ShoppingBagModifierSelection[]
    readonly excludeBagItemId?: string
  }
): Promise<ShoppingBagMutationResult> {
  const context = await resolveBranchContext(supabase, input.tenantSlug, input.branchId)

  if (!context.ok) {
    return context
  }

  const { productMap, productVariantMap, categoryMap, branchOverrideMap, branchVariantOverrideMap } = await loadBranchProductMaps(
    supabase,
    context.tenantId,
    input.branchId,
    [input.productId],
    input.productVariantId ? [input.productVariantId] : []
  )
  const product = productMap.get(input.productId)
  const productVariant = input.productVariantId ? productVariantMap.get(input.productVariantId) ?? null : null

  if (!product) {
    return { ok: false, error: "No encontramos el producto seleccionado." }
  }

  if (input.productVariantId && !productVariant) {
    return { ok: false, error: "No encontramos la variante seleccionada." }
  }

  const modifierSelections = input.modifierSelections ?? []
  const { modifierGroupMap, modifierGroupOptionsMap } = await loadProductModifierConfiguration(supabase, context.tenantId, input.productId)
  const modifierValidationResult = validateModifierSelections(modifierSelections, modifierGroupMap, modifierGroupOptionsMap)

  if (!modifierValidationResult.ok) {
    return modifierValidationResult
  }

  if (!input.productVariantId) {
    const activeVariantsResult = await supabase
      .from("product_variants")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("product_id", input.productId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle<{ id: string }>()

    if (activeVariantsResult.error) {
      return { ok: false, error: activeVariantsResult.error.message }
    }

    if (activeVariantsResult.data) {
      return { ok: false, error: "Selecciona primero un tamano para continuar." }
    }
  }

  const configurationHash = buildConfigurationHash(modifierSelections)
  let existingItemQuery = supabase
    .from("customer_bag_items")
    .select("id, product_id, product_variant_id, configuration_hash, quantity")
    .eq("customer_id", input.customerId)
    .eq("tenant_id", context.tenantId)
    .eq("branch_id", input.branchId)
    .eq("product_id", input.productId)
    .eq("configuration_hash", configurationHash)
    .limit(1)

  existingItemQuery = input.productVariantId
    ? existingItemQuery.eq("product_variant_id", input.productVariantId)
    : existingItemQuery.is("product_variant_id", null)

  if (input.excludeBagItemId) {
    existingItemQuery = existingItemQuery.neq("id", input.excludeBagItemId)
  }

  const existingItemResult = await existingItemQuery.maybeSingle<CustomerBagItemRow>()

  if (existingItemResult.error) {
    return { ok: false, error: existingItemResult.error.message }
  }

  const quantityToAdd = Math.max(input.quantity ?? 1, 1)
  const nextQuantity = (existingItemResult.data?.quantity ?? 0) + quantityToAdd
  const bagItemId = existingItemResult.data?.id ?? crypto.randomUUID()
  const bagItem = buildBagItem(bagItemId, input.tenantSlug, input.branchId, nextQuantity, product, productVariant, categoryMap, branchOverrideMap, branchVariantOverrideMap, modifierSelections)

  if (!bagItem) {
    return { ok: false, error: "Este producto ya no esta disponible en esta sucursal." }
  }

  const mutationResult = existingItemResult.data
    ? await (input.productVariantId
        ? supabase
        .from("customer_bag_items")
        .update({ quantity: nextQuantity })
        .eq("customer_id", input.customerId)
        .eq("tenant_id", context.tenantId)
        .eq("branch_id", input.branchId)
        .eq("product_id", input.productId)
        .eq("configuration_hash", configurationHash)
        .eq("product_variant_id", input.productVariantId)
        : supabase
            .from("customer_bag_items")
            .update({ quantity: nextQuantity })
            .eq("customer_id", input.customerId)
            .eq("tenant_id", context.tenantId)
            .eq("branch_id", input.branchId)
            .eq("product_id", input.productId)
            .eq("configuration_hash", configurationHash)
            .is("product_variant_id", null))
    : await supabase.from("customer_bag_items").insert({
        id: bagItemId,
        customer_id: input.customerId,
        tenant_id: context.tenantId,
        branch_id: input.branchId,
        product_id: input.productId,
        product_variant_id: input.productVariantId ?? null,
        configuration_hash: configurationHash,
        quantity: nextQuantity,
      })

  if (mutationResult.error) {
    return { ok: false, error: mutationResult.error.message }
  }

  if (!existingItemResult.data) {
    const modifierInsertResult = modifierSelections.length
      ? await supabase.from("customer_bag_item_modifiers").insert(
          modifierSelections.map((selection) => ({
            customer_bag_item_id: bagItemId,
            modifier_group_id: selection.modifierGroupId,
            modifier_option_id: selection.modifierOptionId,
            price_delta_snapshot: selection.priceDelta,
          }))
        )
      : { error: null }

    if (modifierInsertResult.error) {
      return { ok: false, error: modifierInsertResult.error.message }
    }
  }

  return {
    ok: true,
    item: bagItem,
    quantity: nextQuantity,
  }
}

export async function replaceCustomerBagItem(
  supabase: SupabaseClient,
  input: {
    readonly bagItemId: string
    readonly tenantSlug: string
    readonly branchId: string
    readonly customerId: string
    readonly productId: string
    readonly productVariantId?: string | null
    readonly quantity: number
    readonly modifierSelections?: readonly ShoppingBagModifierSelection[]
  }
): Promise<ShoppingBagMutationResult> {
  const context = await resolveBranchContext(supabase, input.tenantSlug, input.branchId)

  if (!context.ok) {
    return context
  }

  const currentBagItemResult = await supabase
    .from("customer_bag_items")
    .select("id, product_id, product_variant_id, configuration_hash, quantity")
    .eq("id", input.bagItemId)
    .eq("customer_id", input.customerId)
    .eq("tenant_id", context.tenantId)
    .eq("branch_id", input.branchId)
    .limit(1)
    .maybeSingle<CustomerBagItemRow>()

  if (currentBagItemResult.error || !currentBagItemResult.data) {
    return { ok: false, error: "No encontramos el item original de la bolsa." }
  }

  const nextModifierSelections = input.modifierSelections ?? []
  const nextConfigurationHash = buildConfigurationHash(nextModifierSelections)
  const isSameBagLine =
    currentBagItemResult.data.product_id === input.productId &&
    (currentBagItemResult.data.product_variant_id ?? null) === (input.productVariantId ?? null) &&
    currentBagItemResult.data.configuration_hash === nextConfigurationHash

  if (isSameBagLine) {
    const { productMap, productVariantMap, categoryMap, branchOverrideMap, branchVariantOverrideMap } = await loadBranchProductMaps(
      supabase,
      context.tenantId,
      input.branchId,
      [input.productId],
      input.productVariantId ? [input.productVariantId] : []
    )
    const product = productMap.get(input.productId)
    const productVariant = input.productVariantId ? productVariantMap.get(input.productVariantId) ?? null : null

    if (!product) {
      return { ok: false, error: "No encontramos el producto seleccionado." }
    }

    if (input.productVariantId && !productVariant) {
      return { ok: false, error: "No encontramos la variante seleccionada." }
    }

    const { modifierGroupMap, modifierGroupOptionsMap } = await loadProductModifierConfiguration(supabase, context.tenantId, input.productId)
    const modifierValidationResult = validateModifierSelections(nextModifierSelections, modifierGroupMap, modifierGroupOptionsMap)

    if (!modifierValidationResult.ok) {
      return modifierValidationResult
    }

    const updateResult = await supabase
      .from("customer_bag_items")
      .update({ quantity: Math.max(input.quantity, 1) })
      .eq("id", input.bagItemId)
      .eq("customer_id", input.customerId)

    if (updateResult.error) {
      return { ok: false, error: updateResult.error.message }
    }

    const deleteModifiersResult = await supabase
      .from("customer_bag_item_modifiers")
      .delete()
      .eq("customer_bag_item_id", input.bagItemId)

    if (deleteModifiersResult.error) {
      return { ok: false, error: deleteModifiersResult.error.message }
    }

    if (nextModifierSelections.length > 0) {
      const insertModifiersResult = await supabase.from("customer_bag_item_modifiers").insert(
        nextModifierSelections.map((selection) => ({
          customer_bag_item_id: input.bagItemId,
          modifier_group_id: selection.modifierGroupId,
          modifier_option_id: selection.modifierOptionId,
          price_delta_snapshot: selection.priceDelta,
        }))
      )

      if (insertModifiersResult.error) {
        return { ok: false, error: insertModifiersResult.error.message }
      }
    }

    const bagItem = buildBagItem(
      input.bagItemId,
      input.tenantSlug,
      input.branchId,
      Math.max(input.quantity, 1),
      product,
      productVariant,
      categoryMap,
      branchOverrideMap,
      branchVariantOverrideMap,
      nextModifierSelections
    )

    if (!bagItem) {
      return { ok: false, error: "Este producto ya no esta disponible en esta sucursal." }
    }

    return {
      ok: true,
      item: bagItem,
      quantity: bagItem.quantity,
    }
  }

  const addResult = await addCustomerBagItem(supabase, {
    tenantSlug: input.tenantSlug,
    branchId: input.branchId,
    customerId: input.customerId,
    productId: input.productId,
    productVariantId: input.productVariantId,
    quantity: input.quantity,
    modifierSelections: input.modifierSelections,
    excludeBagItemId: input.bagItemId,
  })

  if (!addResult.ok) {
    return addResult
  }

  const removeResult = await removeCustomerBagItem(supabase, {
    bagItemId: input.bagItemId,
    tenantSlug: input.tenantSlug,
    branchId: input.branchId,
    customerId: input.customerId,
    productId: input.productId,
    productVariantId: input.productVariantId,
  })

  if (!removeResult.ok) {
    return { ok: false, error: removeResult.error ?? "No pudimos actualizar la configuración del producto." }
  }

  return addResult
}

export async function decrementCustomerBagItem(
  supabase: SupabaseClient,
  input: {
    readonly bagItemId?: string
    readonly tenantSlug: string
    readonly branchId: string
    readonly customerId: string
    readonly productId: string
    readonly productVariantId?: string | null
  }
): Promise<ShoppingBagMutationResult> {
  const context = await resolveBranchContext(supabase, input.tenantSlug, input.branchId)

  if (!context.ok) {
    return context
  }

  const existingItemResult = await supabase
    .from("customer_bag_items")
    .select("quantity")
    .eq("id", input.bagItemId ?? "")
    .eq("customer_id", input.customerId)
    .limit(1)
    .maybeSingle<{ quantity: number }>()

  if (existingItemResult.error) {
    return { ok: false, error: existingItemResult.error.message }
  }

  if (!existingItemResult.data) {
    return { ok: true, quantity: 0 }
  }

  const nextQuantity = existingItemResult.data.quantity - 1

  const mutationResult =
    nextQuantity > 0
      ? await supabase
          .from("customer_bag_items")
          .update({ quantity: nextQuantity })
          .eq("id", input.bagItemId ?? "")
          .eq("customer_id", input.customerId)
      : await supabase
          .from("customer_bag_items")
          .delete()
          .eq("id", input.bagItemId ?? "")
          .eq("customer_id", input.customerId)

  if (mutationResult.error) {
    return { ok: false, error: mutationResult.error.message }
  }

  return {
    ok: true,
    quantity: Math.max(nextQuantity, 0),
  }
}

export async function removeCustomerBagItem(
  supabase: SupabaseClient,
  input: {
    readonly bagItemId?: string
    readonly tenantSlug: string
    readonly branchId: string
    readonly customerId: string
    readonly productId: string
    readonly productVariantId?: string | null
  }
): Promise<ShoppingBagMutationResult> {
  const context = await resolveBranchContext(supabase, input.tenantSlug, input.branchId)

  if (!context.ok) {
    return context
  }

  const mutationResult = await supabase
    .from("customer_bag_items")
    .delete()
    .eq("id", input.bagItemId ?? "")
    .eq("customer_id", input.customerId)

  if (mutationResult.error) {
    return { ok: false, error: mutationResult.error.message }
  }

  return { ok: true, quantity: 0 }
}

export async function clearCustomerBranchBag(
  supabase: SupabaseClient,
  input: {
    readonly tenantSlug: string
    readonly branchId: string
    readonly customerId: string
  }
): Promise<ShoppingBagMutationResult> {
  const context = await resolveBranchContext(supabase, input.tenantSlug, input.branchId)

  if (!context.ok) {
    return context
  }

  const mutationResult = await supabase
    .from("customer_bag_items")
    .delete()
    .eq("customer_id", input.customerId)
    .eq("tenant_id", context.tenantId)
    .eq("branch_id", input.branchId)

  if (mutationResult.error) {
    return { ok: false, error: mutationResult.error.message }
  }

  return { ok: true, quantity: 0 }
}
