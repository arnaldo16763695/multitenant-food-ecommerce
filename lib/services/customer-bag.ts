import type { SupabaseClient } from "@supabase/supabase-js"

import type { ShoppingBagItem, ShoppingBagMutationResult } from "@/lib/domain/bag"

type TenantRow = {
  id: string
}

type BranchRow = {
  id: string
}

type CustomerBagItemRow = {
  product_id: string
  product_variant_id: string | null
  quantity: number
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

function buildBagItem(
  tenantSlug: string,
  branchId: string,
  quantity: number,
  product: ProductRow,
  productVariant: ProductVariantRow | null,
  categoryMap: ReadonlyMap<string, string>,
  branchOverrideMap: ReadonlyMap<string, BranchProductOverrideRow>,
  branchVariantOverrideMap: ReadonlyMap<string, BranchProductVariantOverrideRow>
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

  const unitPrice = Number(productVariant ? branchVariantOverride?.price_override ?? productVariant.base_price : branchOverride?.price_override ?? product.base_price)

  return {
    id: productVariant?.id ?? product.id,
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
    .select("product_id, product_variant_id, quantity")
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

  return bagItemsResult.data.flatMap((item) => {
    const product = productMap.get(item.product_id)

    if (!product) {
      return []
    }

    const bagItem = buildBagItem(tenantSlug, branchId, item.quantity, product, item.product_variant_id ? productVariantMap.get(item.product_variant_id) ?? null : null, categoryMap, branchOverrideMap, branchVariantOverrideMap)

    return bagItem ? [bagItem] : []
  })
}

export async function addCustomerBagItem(
  supabase: SupabaseClient,
  input: {
    readonly tenantSlug: string
    readonly branchId: string
    readonly customerId: string
    readonly productId: string
    readonly productVariantId?: string | null
    readonly quantity?: number
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

  const existingItemResult = await supabase
    .from("customer_bag_items")
    .select("product_id, product_variant_id, quantity")
    .eq("customer_id", input.customerId)
    .eq("tenant_id", context.tenantId)
    .eq("branch_id", input.branchId)
    .eq("product_id", input.productId)
    .is("product_variant_id", input.productVariantId ?? null)
    .limit(1)
    .maybeSingle<CustomerBagItemRow>()

  if (existingItemResult.error) {
    return { ok: false, error: existingItemResult.error.message }
  }

  const quantityToAdd = Math.max(input.quantity ?? 1, 1)
  const nextQuantity = (existingItemResult.data?.quantity ?? 0) + quantityToAdd
  const bagItem = buildBagItem(input.tenantSlug, input.branchId, nextQuantity, product, productVariant, categoryMap, branchOverrideMap, branchVariantOverrideMap)

  if (!bagItem) {
    return { ok: false, error: "Este producto ya no esta disponible en esta sucursal." }
  }

  const mutationResult = existingItemResult.data
    ? await supabase
        .from("customer_bag_items")
        .update({ quantity: nextQuantity })
        .eq("customer_id", input.customerId)
        .eq("tenant_id", context.tenantId)
        .eq("branch_id", input.branchId)
        .eq("product_id", input.productId)
        .is("product_variant_id", input.productVariantId ?? null)
    : await supabase.from("customer_bag_items").insert({
        customer_id: input.customerId,
        tenant_id: context.tenantId,
        branch_id: input.branchId,
        product_id: input.productId,
        product_variant_id: input.productVariantId ?? null,
        quantity: nextQuantity,
      })

  if (mutationResult.error) {
    return { ok: false, error: mutationResult.error.message }
  }

  return {
    ok: true,
    item: bagItem,
    quantity: nextQuantity,
  }
}

export async function decrementCustomerBagItem(
  supabase: SupabaseClient,
  input: {
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
    .eq("customer_id", input.customerId)
    .eq("tenant_id", context.tenantId)
    .eq("branch_id", input.branchId)
    .eq("product_id", input.productId)
    .is("product_variant_id", input.productVariantId ?? null)
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
          .eq("customer_id", input.customerId)
          .eq("tenant_id", context.tenantId)
          .eq("branch_id", input.branchId)
          .eq("product_id", input.productId)
          .is("product_variant_id", input.productVariantId ?? null)
      : await supabase
          .from("customer_bag_items")
          .delete()
          .eq("customer_id", input.customerId)
          .eq("tenant_id", context.tenantId)
          .eq("branch_id", input.branchId)
          .eq("product_id", input.productId)
          .is("product_variant_id", input.productVariantId ?? null)

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
    .eq("customer_id", input.customerId)
    .eq("tenant_id", context.tenantId)
    .eq("branch_id", input.branchId)
    .eq("product_id", input.productId)
    .is("product_variant_id", input.productVariantId ?? null)

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
