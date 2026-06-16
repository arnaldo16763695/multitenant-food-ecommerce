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

type CategoryRow = {
  id: string
  name: string
}

type BranchProductOverrideRow = {
  product_id: string
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

async function loadBranchProductMaps(supabase: SupabaseClient, tenantId: string, branchId: string, productIds: readonly string[]) {
  if (!productIds.length) {
    return {
      productMap: new Map<string, ProductRow>(),
      categoryMap: new Map<string, string>(),
      branchOverrideMap: new Map<string, BranchProductOverrideRow>(),
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

  const [categoriesResult, branchOverridesResult] = await Promise.all([
    categoryIds.length
      ? supabase.from("categories").select("id, name").in("id", categoryIds).returns<CategoryRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: CategoryRow[]; error: null }),
    supabase
      .from("branch_product_overrides")
      .select("product_id, availability_status, price_override")
      .eq("branch_id", branchId)
      .in("product_id", [...productIds])
      .returns<BranchProductOverrideRow[]>(),
  ])

  if (categoriesResult.error || branchOverridesResult.error) {
    throw new Error(categoriesResult.error?.message ?? branchOverridesResult.error?.message ?? "No pudimos validar la bolsa.")
  }

  return {
    productMap: new Map(products.map((product) => [product.id, product])),
    categoryMap: new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name])),
    branchOverrideMap: new Map((branchOverridesResult.data ?? []).map((override) => [override.product_id, override])),
  }
}

function buildBagItem(
  tenantSlug: string,
  branchId: string,
  quantity: number,
  product: ProductRow,
  categoryMap: ReadonlyMap<string, string>,
  branchOverrideMap: ReadonlyMap<string, BranchProductOverrideRow>
): ShoppingBagItem | null {
  if (product.status !== "active") {
    return null
  }

  const branchOverride = branchOverrideMap.get(product.id)

  if (branchOverride && branchOverride.availability_status !== "available") {
    return null
  }

  const unitPrice = Number(branchOverride?.price_override ?? product.base_price)

  return {
    id: product.id,
    tenantSlug,
    branchId,
    name: product.name,
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
    .select("product_id, quantity")
    .eq("customer_id", customerId)
    .eq("tenant_id", context.tenantId)
    .eq("branch_id", branchId)
    .returns<CustomerBagItemRow[]>()

  if (bagItemsResult.error || !bagItemsResult.data?.length) {
    return []
  }

  const productIds = [...new Set(bagItemsResult.data.map((item) => item.product_id))]
  const { productMap, categoryMap, branchOverrideMap } = await loadBranchProductMaps(supabase, context.tenantId, branchId, productIds)

  return bagItemsResult.data.flatMap((item) => {
    const product = productMap.get(item.product_id)

    if (!product) {
      return []
    }

    const bagItem = buildBagItem(tenantSlug, branchId, item.quantity, product, categoryMap, branchOverrideMap)

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
  }
): Promise<ShoppingBagMutationResult> {
  const context = await resolveBranchContext(supabase, input.tenantSlug, input.branchId)

  if (!context.ok) {
    return context
  }

  const { productMap, categoryMap, branchOverrideMap } = await loadBranchProductMaps(supabase, context.tenantId, input.branchId, [input.productId])
  const product = productMap.get(input.productId)

  if (!product) {
    return { ok: false, error: "No encontramos el producto seleccionado." }
  }

  const existingItemResult = await supabase
    .from("customer_bag_items")
    .select("product_id, quantity")
    .eq("customer_id", input.customerId)
    .eq("tenant_id", context.tenantId)
    .eq("branch_id", input.branchId)
    .eq("product_id", input.productId)
    .limit(1)
    .maybeSingle<CustomerBagItemRow>()

  if (existingItemResult.error) {
    return { ok: false, error: existingItemResult.error.message }
  }

  const nextQuantity = (existingItemResult.data?.quantity ?? 0) + 1
  const bagItem = buildBagItem(input.tenantSlug, input.branchId, nextQuantity, product, categoryMap, branchOverrideMap)

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
    : await supabase.from("customer_bag_items").insert({
        customer_id: input.customerId,
        tenant_id: context.tenantId,
        branch_id: input.branchId,
        product_id: input.productId,
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
      : await supabase
          .from("customer_bag_items")
          .delete()
          .eq("customer_id", input.customerId)
          .eq("tenant_id", context.tenantId)
          .eq("branch_id", input.branchId)
          .eq("product_id", input.productId)

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
