import type { SupabaseClient } from "@supabase/supabase-js"

import {
  catalogCategories,
  catalogModifierGroups,
  catalogProducts,
  type CatalogCategory,
  type CatalogModifierGroup,
  type CatalogProduct,
} from "@/lib/config/admin-catalog"
import { getCatalogMediaPublicUrl } from "@/lib/supabase/storage"
import {
  fromCatalogDbVisibility,
  fromCatalogDbStatus,
  normalizeCatalogPrice,
  slugifyCatalogValue,
  toCatalogDbVisibility,
  toCatalogDbStatus,
  type CatalogCategoryMutationInput,
  type CatalogMutationResult,
  type CatalogProductMutationInput,
  type CatalogProductStatus,
} from "@/lib/domain/catalog"

type CatalogModuleData = {
  readonly products: readonly CatalogProduct[]
  readonly categories: readonly CatalogCategory[]
  readonly modifierGroups: readonly CatalogModifierGroup[]
  readonly source: "supabase" | "mock"
}

type CategoryRow = { id: string; name: string; is_visible: boolean; image_path: string | null }
type ProductRow = {
  id: string
  name: string
  description: string
  base_price: number | string
  status: "active" | "draft"
  tags: string[] | null
  category_id: string | null
  primary_image_path: string | null
  primary_image_alt: string | null
}
type BranchRow = { id: string; name: string }
type ModifierGroupRow = { id: string; name: string; selection_type: "single" | "multiple" }
type ProductModifierGroupRow = { product_id: string; modifier_group_id: string }
type BranchProductOverrideRow = {
  branch_id: string
  product_id: string
  availability_status: "available" | "paused" | "out_of_stock"
  price_override: number | string | null
  prep_time_minutes: number | null
}

export const MOCK_CATALOG_MODULE: CatalogModuleData = {
  products: catalogProducts,
  categories: catalogCategories,
  modifierGroups: catalogModifierGroups,
  source: "mock",
}

function formatCurrency(value: number | string | null) {
  const numericValue = typeof value === "number" ? value : Number(value ?? 0)

  return `$ ${numericValue.toFixed(2)}`
}

function mapAvailabilityStatus(status: BranchProductOverrideRow["availability_status"]) {
  if (status === "available") return "Disponible" as const
  if (status === "paused") return "Pausado" as const

  return "Sin stock" as const
}

async function resolveCategoryId(supabase: SupabaseClient, tenantId: string, categoryName: string) {
  const normalizedCategoryName = categoryName.trim()

  if (!normalizedCategoryName) {
    return null
  }

  const categoryResult = await supabase
    .from("categories")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("name", normalizedCategoryName)
    .limit(1)
    .maybeSingle<{ id: string }>()

  return categoryResult.data?.id ?? null
}

async function resolveUniqueCategorySlug(supabase: SupabaseClient, tenantId: string, baseName: string, excludeCategoryId?: string) {
  const baseSlug = slugifyCatalogValue(baseName) || `category-${Date.now()}`
  let candidateSlug = baseSlug
  let suffix = 1

  while (true) {
    let query = supabase.from("categories").select("id").eq("tenant_id", tenantId).eq("slug", candidateSlug).limit(1)

    if (excludeCategoryId) {
      query = query.neq("id", excludeCategoryId)
    }

    const existingCategory = await query.maybeSingle<{ id: string }>()

    if (!existingCategory.data) {
      return candidateSlug
    }

    suffix += 1
    candidateSlug = `${baseSlug}-${suffix}`
  }
}

async function resolveUniqueSlug(supabase: SupabaseClient, tenantId: string, baseName: string, excludeProductId?: string) {
  const baseSlug = slugifyCatalogValue(baseName) || `product-${Date.now()}`
  let candidateSlug = baseSlug
  let suffix = 1

  while (true) {
    let query = supabase.from("products").select("id").eq("tenant_id", tenantId).eq("slug", candidateSlug).limit(1)

    if (excludeProductId) {
      query = query.neq("id", excludeProductId)
    }

    const existingProduct = await query.maybeSingle<{ id: string }>()

    if (!existingProduct.data) {
      return candidateSlug
    }

    suffix += 1
    candidateSlug = `${baseSlug}-${suffix}`
  }
}

export async function getCatalogModuleFromSupabase(supabase: SupabaseClient, tenantId: string): Promise<CatalogModuleData> {
  const [branchesResult, categoriesResult, productsResult, modifierGroupsResult] = await Promise.all([
    supabase.from("branches").select("id, name").eq("tenant_id", tenantId).returns<BranchRow[]>(),
    supabase.from("categories").select("id, name, is_visible, image_path").eq("tenant_id", tenantId).order("sort_order", { ascending: true }).returns<CategoryRow[]>(),
    supabase.from("products").select("id, name, description, base_price, status, tags, category_id, primary_image_path, primary_image_alt").eq("tenant_id", tenantId).order("name", { ascending: true }).returns<ProductRow[]>(),
    supabase.from("modifier_groups").select("id, name, selection_type").eq("tenant_id", tenantId).eq("is_active", true).order("name", { ascending: true }).returns<ModifierGroupRow[]>(),
  ])

  if (branchesResult.error || categoriesResult.error || productsResult.error || modifierGroupsResult.error) {
    return MOCK_CATALOG_MODULE
  }

  const branches = branchesResult.data ?? []
  const categories = categoriesResult.data ?? []
  const products = productsResult.data ?? []
  const modifierGroups = modifierGroupsResult.data ?? []

  const productIds = products.map((product) => product.id)

  const [productModifierGroupsResult, branchProductOverridesResult] = await Promise.all([
    productIds.length
      ? supabase.from("product_modifier_groups").select("product_id, modifier_group_id").in("product_id", productIds).returns<ProductModifierGroupRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: ProductModifierGroupRow[]; error: null }),
    productIds.length
      ? supabase
          .from("branch_product_overrides")
          .select("branch_id, product_id, availability_status, price_override, prep_time_minutes")
          .in("product_id", productIds)
          .returns<BranchProductOverrideRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: BranchProductOverrideRow[]; error: null }),
  ])

  if (productModifierGroupsResult.error || branchProductOverridesResult.error) {
    return MOCK_CATALOG_MODULE
  }

  const productModifierGroups = productModifierGroupsResult.data ?? []
  const branchProductOverrides = branchProductOverridesResult.data ?? []

  const categoryMap = new Map(categories.map((category) => [category.id, category]))
  const branchMap = new Map(branches.map((branch) => [branch.id, branch]))
  const modifierGroupMap = new Map(modifierGroups.map((group) => [group.id, group]))

  const productModifierGroupsMap = productModifierGroups.reduce<Map<string, string[]>>((map, relation) => {
    const currentValue = map.get(relation.product_id) ?? []
    map.set(relation.product_id, [...currentValue, relation.modifier_group_id])
    return map
  }, new Map())

  const branchProductOverridesMap = branchProductOverrides.reduce<Map<string, BranchProductOverrideRow[]>>((map, override) => {
    const currentValue = map.get(override.product_id) ?? []
    map.set(override.product_id, [...currentValue, override])
    return map
  }, new Map())

  const mappedProducts: CatalogProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category_id ? (categoryMap.get(product.category_id)?.name ?? "Sin categoria") : "Sin categoria",
    description: product.description,
    basePrice: formatCurrency(product.base_price),
    status: fromCatalogDbStatus(product.status),
    primaryImagePath: product.primary_image_path,
    primaryImageUrl: getCatalogMediaPublicUrl(product.primary_image_path),
    tags: product.tags ?? [],
    modifierGroups: (productModifierGroupsMap.get(product.id) ?? [])
      .map((modifierGroupId) => modifierGroupMap.get(modifierGroupId)?.name)
      .filter((value): value is string => Boolean(value)),
    branchStatuses: (branchProductOverridesMap.get(product.id) ?? []).map((override) => ({
      branchName: branchMap.get(override.branch_id)?.name ?? "Sucursal",
      availability: mapAvailabilityStatus(override.availability_status),
      price: formatCurrency(override.price_override ?? product.base_price),
      prepTime: override.prep_time_minutes ? `${override.prep_time_minutes} min` : "-",
    })),
  }))

  const mappedCategories: CatalogCategory[] = categories.map((category) => ({
    name: category.name,
    itemCount: mappedProducts.filter((product) => product.category === category.name).length,
    visibility: fromCatalogDbVisibility(category.is_visible),
    imagePath: category.image_path,
    imageUrl: getCatalogMediaPublicUrl(category.image_path),
  }))

  const modifierUsageCount = productModifierGroups.reduce<Map<string, number>>((map, relation) => {
    map.set(relation.modifier_group_id, (map.get(relation.modifier_group_id) ?? 0) + 1)
    return map
  }, new Map())

  const mappedModifierGroups: CatalogModifierGroup[] = modifierGroups.map((group) => ({
    name: group.name,
    type: group.selection_type === "single" ? "Single" : "Multiple",
    appliedTo: `${modifierUsageCount.get(group.id) ?? 0} productos`,
  }))

  if (!mappedProducts.length && !mappedCategories.length && !mappedModifierGroups.length) {
    return MOCK_CATALOG_MODULE
  }

  return {
    products: mappedProducts.length ? mappedProducts : catalogProducts,
    categories: mappedCategories.length ? mappedCategories : catalogCategories,
    modifierGroups: mappedModifierGroups.length ? mappedModifierGroups : catalogModifierGroups,
    source: "supabase",
  }
}

export async function createCatalogProduct(supabase: SupabaseClient, tenantId: string, payload: CatalogProductMutationInput): Promise<CatalogMutationResult> {
  return createCatalogProductWithOptions(supabase, tenantId, payload)
}

export async function createCatalogProductWithOptions(
  supabase: SupabaseClient,
  tenantId: string,
  payload: CatalogProductMutationInput,
  options?: {
    readonly productId?: string
  }
): Promise<CatalogMutationResult> {
  const normalizedPrice = normalizeCatalogPrice(payload.basePrice)

  if (!payload.name.trim() || !payload.category.trim() || !normalizedPrice) {
    return { ok: false, error: "Completa nombre, categoria y precio base valido." }
  }

  const [categoryId, productSlug] = await Promise.all([
    resolveCategoryId(supabase, tenantId, payload.category),
    resolveUniqueSlug(supabase, tenantId, payload.name),
  ])

  const insertResult = await supabase.from("products").insert({
    id: options?.productId,
    tenant_id: tenantId,
    category_id: categoryId,
    name: payload.name.trim(),
    slug: productSlug,
    description: payload.description.trim(),
    base_price: normalizedPrice,
    status: toCatalogDbStatus(payload.status),
    primary_image_path: payload.primaryImagePath?.trim() || null,
    primary_image_alt: payload.primaryImageAlt?.trim() || null,
    tags: ["New"],
  })

  if (insertResult.error) {
    return { ok: false, error: insertResult.error.message }
  }

  return { ok: true, entityId: options?.productId }
}

export async function updateCatalogProduct(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
  payload: CatalogProductMutationInput
): Promise<CatalogMutationResult> {
  const normalizedPrice = normalizeCatalogPrice(payload.basePrice)

  if (!payload.name.trim() || !payload.category.trim() || !normalizedPrice) {
    return { ok: false, error: "Completa nombre, categoria y precio base valido." }
  }

  const [categoryId, productSlug] = await Promise.all([
    resolveCategoryId(supabase, tenantId, payload.category),
    resolveUniqueSlug(supabase, tenantId, payload.name, productId),
  ])

  const updateResult = await supabase
    .from("products")
    .update({
      category_id: categoryId,
      name: payload.name.trim(),
      slug: productSlug,
      description: payload.description.trim(),
      base_price: normalizedPrice,
      status: toCatalogDbStatus(payload.status),
      primary_image_path: payload.primaryImagePath?.trim() || null,
      primary_image_alt: payload.primaryImageAlt?.trim() || null,
    })
    .eq("id", productId)
    .eq("tenant_id", tenantId)

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
  }

  return { ok: true }
}

export async function toggleCatalogProductStatus(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
  currentStatus: CatalogProductStatus
): Promise<CatalogMutationResult> {
  const updateResult = await supabase
    .from("products")
    .update({ status: currentStatus === "Activo" ? "draft" : "active" })
    .eq("id", productId)
    .eq("tenant_id", tenantId)

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
  }

  return { ok: true }
}

export async function duplicateCatalogProduct(supabase: SupabaseClient, tenantId: string, productId: string): Promise<CatalogMutationResult> {
  const productResult = await supabase
    .from("products")
    .select("name, description, base_price, category_id")
    .eq("id", productId)
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle<{ name: string; description: string; base_price: number; category_id: string | null }>()

  if (productResult.error || !productResult.data) {
    return { ok: false, error: "No encontramos el producto a duplicar." }
  }

  const duplicateName = `${productResult.data.name} Copy`
  const duplicateSlug = await resolveUniqueSlug(supabase, tenantId, duplicateName)

  const insertResult = await supabase.from("products").insert({
    tenant_id: tenantId,
    category_id: productResult.data.category_id,
    name: duplicateName,
    slug: duplicateSlug,
    description: productResult.data.description,
    base_price: productResult.data.base_price,
    status: "draft",
    tags: ["Copy"],
  })

  if (insertResult.error) {
    return { ok: false, error: insertResult.error.message }
  }

  return { ok: true }
}

export async function createCatalogCategory(
  supabase: SupabaseClient,
  tenantId: string,
  payload: CatalogCategoryMutationInput,
  options?: {
    readonly categoryId?: string
  }
): Promise<CatalogMutationResult> {
  if (!payload.name.trim()) {
    return { ok: false, error: "Completa el nombre de la categoria." }
  }

  const categorySlug = await resolveUniqueCategorySlug(supabase, tenantId, payload.name)

  const insertResult = await supabase.from("categories").insert({
    id: options?.categoryId,
    tenant_id: tenantId,
    name: payload.name.trim(),
    slug: categorySlug,
    is_visible: toCatalogDbVisibility(payload.visibility),
    sort_order: payload.sortOrder,
    image_path: payload.imagePath?.trim() || null,
    image_alt: payload.imageAlt?.trim() || null,
  })

  if (insertResult.error) {
    return { ok: false, error: insertResult.error.message }
  }

  return { ok: true, entityId: options?.categoryId }
}

export async function updateCatalogCategory(
  supabase: SupabaseClient,
  tenantId: string,
  categoryId: string,
  payload: CatalogCategoryMutationInput
): Promise<CatalogMutationResult> {
  if (!payload.name.trim()) {
    return { ok: false, error: "Completa el nombre de la categoria." }
  }

  const categorySlug = await resolveUniqueCategorySlug(supabase, tenantId, payload.name, categoryId)

  const updateResult = await supabase
    .from("categories")
    .update({
      name: payload.name.trim(),
      slug: categorySlug,
      is_visible: toCatalogDbVisibility(payload.visibility),
      sort_order: payload.sortOrder,
      image_path: payload.imagePath?.trim() || null,
      image_alt: payload.imageAlt?.trim() || null,
    })
    .eq("id", categoryId)
    .eq("tenant_id", tenantId)

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message }
  }

  return { ok: true }
}
