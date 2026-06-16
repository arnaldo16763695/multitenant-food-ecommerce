import type { SupabaseClient } from "@supabase/supabase-js"

import {
  type CatalogBranchOption,
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
  type CatalogBranchOverrideInput,
  type CatalogCategoryMutationInput,
  type CatalogMutationResult,
  type CatalogProductMutationInput,
  type CatalogProductVariantInput,
  type CatalogProductStatus,
} from "@/lib/domain/catalog"

type CatalogModuleData = {
  readonly branches: readonly CatalogBranchOption[]
  readonly products: readonly CatalogProduct[]
  readonly categories: readonly CatalogCategory[]
  readonly modifierGroups: readonly CatalogModifierGroup[]
  readonly source: "supabase"
}

type CategoryRow = { id: string; name: string; is_visible: boolean; image_path: string | null; sort_order: number }
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
type ProductVariantRow = { id: string; product_id: string; name: string; base_price: number | string; is_default: boolean; is_active: boolean; sort_order: number }
type ProductModifierGroupRow = { product_id: string; modifier_group_id: string }
type BranchProductOverrideRow = {
  branch_id: string
  product_id: string
  availability_status: "available" | "paused" | "out_of_stock"
  price_override: number | string | null
  prep_time_minutes: number | null
}

export const EMPTY_CATALOG_MODULE: CatalogModuleData = {
  branches: [],
  products: [],
  categories: [],
  modifierGroups: [],
  source: "supabase",
}

function normalizeVariantInputs(variants?: readonly CatalogProductVariantInput[]) {
  const normalizedVariants = (variants ?? [])
    .map((variant, index) => ({
      id: variant.id,
      name: variant.name.trim(),
      basePrice: normalizeCatalogPrice(variant.basePrice),
      isDefault: variant.isDefault,
      sortOrder: variant.sortOrder ?? index,
    }))
    .filter((variant) => variant.name && variant.basePrice)

  if (normalizedVariants.length === 0) {
    return { ok: true as const, variants: [] as const }
  }

  if (normalizedVariants.filter((variant) => variant.isDefault).length !== 1) {
    return { ok: false as const, error: "Define exactamente una variante predeterminada." }
  }

  if (new Set(normalizedVariants.map((variant) => variant.name.toLowerCase())).size !== normalizedVariants.length) {
    return { ok: false as const, error: "Las variantes no pueden repetir nombre." }
  }

  return { ok: true as const, variants: normalizedVariants }
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

function normalizePrepTimeMinutes(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  const numericValue = Number(trimmedValue)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null
  }

  return Math.round(numericValue)
}

async function buildBranchProductOverridesPayload(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
  branchOverrides?: readonly CatalogBranchOverrideInput[]
) {
  const branchesResult = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .returns<BranchRow[]>()

  if (branchesResult.error) {
    return { ok: false as const, error: branchesResult.error.message }
  }

  const branches = branchesResult.data ?? []
  const overrideMap = new Map((branchOverrides ?? []).map((override) => [override.branchId, override]))

  return {
    ok: true as const,
    rows: branches.map((branch) => {
      const override = overrideMap.get(branch.id)

      return {
        branch_id: branch.id,
        product_id: productId,
        availability_status: override?.availabilityStatus ?? "available",
        price_override: normalizeCatalogPrice(override?.priceOverride ?? "") ?? null,
        prep_time_minutes: normalizePrepTimeMinutes(override?.prepTimeMinutes ?? ""),
      }
    }),
  }
}

async function upsertBranchProductOverrides(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
  branchOverrides?: readonly CatalogBranchOverrideInput[]
): Promise<CatalogMutationResult> {
  const payloadResult = await buildBranchProductOverridesPayload(supabase, tenantId, productId, branchOverrides)

  if (!payloadResult.ok) {
    return { ok: false, error: payloadResult.error }
  }

  if (!payloadResult.rows.length) {
    return { ok: true }
  }

  const upsertResult = await supabase.from("branch_product_overrides").upsert(payloadResult.rows, {
    onConflict: "branch_id,product_id",
  })

  if (upsertResult.error) {
    return { ok: false, error: upsertResult.error.message }
  }

  return { ok: true }
}

export async function updateCatalogProductBranchOverrides(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
  branchOverrides: readonly CatalogBranchOverrideInput[],
  allowedBranchIds: readonly string[]
): Promise<CatalogMutationResult> {
  if (!allowedBranchIds.length) {
    return { ok: false, error: "No tienes sucursales activas asignadas para operar productos." }
  }

  const scopedOverrides = branchOverrides.filter((override) => allowedBranchIds.includes(override.branchId))

  if (!scopedOverrides.length) {
    return { ok: false, error: "No enviamos overrides validos para tus sucursales asignadas." }
  }

  const rows = scopedOverrides.map((override) => ({
    branch_id: override.branchId,
    product_id: productId,
    availability_status: override.availabilityStatus,
    price_override: normalizeCatalogPrice(override.priceOverride) ?? null,
    prep_time_minutes: normalizePrepTimeMinutes(override.prepTimeMinutes),
  }))

  const upsertResult = await supabase.from("branch_product_overrides").upsert(rows, {
    onConflict: "branch_id,product_id",
  })

  if (upsertResult.error) {
    return { ok: false, error: upsertResult.error.message }
  }

  return { ok: true }
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

async function validateProductCategory(supabase: SupabaseClient, tenantId: string, categoryName: string) {
  const availableCategoriesResult = await supabase
    .from("categories")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1)
    .returns<{ id: string }[]>()

  if (availableCategoriesResult.error) {
    return {
      ok: false as const,
      error: availableCategoriesResult.error.message,
    }
  }

  if (!(availableCategoriesResult.data ?? []).length) {
    return {
      ok: false as const,
      error: "Primero crea al menos una categoria para poder registrar productos en este tenant.",
    }
  }

  const categoryId = await resolveCategoryId(supabase, tenantId, categoryName)

  if (!categoryId) {
    return {
      ok: false as const,
      error: "Selecciona una categoria valida antes de guardar el producto.",
    }
  }

  return {
    ok: true as const,
    categoryId,
  }
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

async function syncProductVariants(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
  variants?: readonly CatalogProductVariantInput[]
): Promise<CatalogMutationResult> {
  const normalizedVariantsResult = normalizeVariantInputs(variants)

  if (!normalizedVariantsResult.ok) {
    return { ok: false, error: normalizedVariantsResult.error }
  }

  const normalizedVariants = normalizedVariantsResult.variants
  const existingVariantsResult = await supabase
    .from("product_variants")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .returns<{ id: string }[]>()

  if (existingVariantsResult.error) {
    return { ok: false, error: existingVariantsResult.error.message }
  }

  const existingVariantIds = new Set((existingVariantsResult.data ?? []).map((variant) => variant.id))
  const nextVariantIds = new Set(normalizedVariants.map((variant) => variant.id).filter((value): value is string => Boolean(value)))
  const variantIdsToDelete = [...existingVariantIds].filter((variantId) => !nextVariantIds.has(variantId))

  if (variantIdsToDelete.length > 0) {
    const deleteResult = await supabase.from("product_variants").delete().eq("tenant_id", tenantId).eq("product_id", productId).in("id", variantIdsToDelete)

    if (deleteResult.error) {
      return { ok: false, error: deleteResult.error.message }
    }
  }

  if (normalizedVariants.length === 0) {
    return { ok: true }
  }

  const resetDefaultsResult = await supabase.from("product_variants").update({ is_default: false }).eq("tenant_id", tenantId).eq("product_id", productId)

  if (resetDefaultsResult.error) {
    return { ok: false, error: resetDefaultsResult.error.message }
  }

  const upsertResult = await supabase.from("product_variants").upsert(
    normalizedVariants.map((variant) => ({
      id: variant.id,
      tenant_id: tenantId,
      product_id: productId,
      name: variant.name,
      base_price: variant.basePrice,
      is_default: variant.isDefault,
      is_active: true,
      sort_order: variant.sortOrder,
    })),
    {
      onConflict: "id",
    }
  )

  if (upsertResult.error) {
    return { ok: false, error: upsertResult.error.message }
  }

  return { ok: true }
}

export async function getCatalogModuleFromSupabase(supabase: SupabaseClient, tenantId: string): Promise<CatalogModuleData> {
  const [branchesResult, categoriesResult, productsResult, modifierGroupsResult, productVariantsResult] = await Promise.all([
    supabase.from("branches").select("id, name").eq("tenant_id", tenantId).returns<BranchRow[]>(),
    supabase.from("categories").select("id, name, is_visible, image_path, sort_order").eq("tenant_id", tenantId).order("sort_order", { ascending: true }).returns<CategoryRow[]>(),
    supabase.from("products").select("id, name, description, base_price, status, tags, category_id, primary_image_path, primary_image_alt").eq("tenant_id", tenantId).order("name", { ascending: true }).returns<ProductRow[]>(),
    supabase.from("modifier_groups").select("id, name, selection_type").eq("tenant_id", tenantId).eq("is_active", true).order("name", { ascending: true }).returns<ModifierGroupRow[]>(),
    supabase.from("product_variants").select("id, product_id, name, base_price, is_default, is_active, sort_order").eq("tenant_id", tenantId).eq("is_active", true).order("sort_order", { ascending: true }).returns<ProductVariantRow[]>(),
  ])

  if (branchesResult.error || categoriesResult.error || productsResult.error || modifierGroupsResult.error || productVariantsResult.error) {
    return EMPTY_CATALOG_MODULE
  }

  const branches = branchesResult.data ?? []
  const categories = categoriesResult.data ?? []
  const products = productsResult.data ?? []
  const modifierGroups = modifierGroupsResult.data ?? []
  const productVariants = productVariantsResult.data ?? []

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
    return EMPTY_CATALOG_MODULE
  }

  const productModifierGroups = productModifierGroupsResult.data ?? []
  const branchProductOverrides = branchProductOverridesResult.data ?? []

  const categoryMap = new Map(categories.map((category) => [category.id, category]))
  const branchMap = new Map(branches.map((branch) => [branch.id, branch]))
  const modifierGroupMap = new Map(modifierGroups.map((group) => [group.id, group]))
  const productVariantsMap = productVariants.reduce<Map<string, ProductVariantRow[]>>((map, variant) => {
    const currentValue = map.get(variant.product_id) ?? []
    map.set(variant.product_id, [...currentValue, variant])
    return map
  }, new Map())

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
    hasVariants: (productVariantsMap.get(product.id) ?? []).length > 0,
    variants: (productVariantsMap.get(product.id) ?? []).map((variant) => ({
      id: variant.id,
      name: variant.name,
      basePrice: formatCurrency(variant.base_price),
      isDefault: variant.is_default,
    })),
    status: fromCatalogDbStatus(product.status),
    primaryImagePath: product.primary_image_path,
    primaryImageUrl: getCatalogMediaPublicUrl(product.primary_image_path),
    tags: product.tags ?? [],
    modifierGroups: (productModifierGroupsMap.get(product.id) ?? [])
      .map((modifierGroupId) => modifierGroupMap.get(modifierGroupId)?.name)
      .filter((value): value is string => Boolean(value)),
    branchStatuses: (branchProductOverridesMap.get(product.id) ?? []).map((override) => ({
      branchId: override.branch_id,
      branchName: branchMap.get(override.branch_id)?.name ?? "Sucursal",
      availabilityStatus: override.availability_status,
      availability: mapAvailabilityStatus(override.availability_status),
      priceOverride: override.price_override == null ? "" : String(override.price_override),
      price: formatCurrency(override.price_override ?? product.base_price),
      prepTimeMinutes: override.prep_time_minutes == null ? "" : String(override.prep_time_minutes),
      prepTime: override.prep_time_minutes ? `${override.prep_time_minutes} min` : "-",
    })),
  }))

  const mappedCategories: CatalogCategory[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    itemCount: mappedProducts.filter((product) => product.category === category.name).length,
    visibility: fromCatalogDbVisibility(category.is_visible),
    sortOrder: category.sort_order,
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

  return {
    branches: branches.map((branch) => ({ id: branch.id, name: branch.name })),
    products: mappedProducts,
    categories: mappedCategories,
    modifierGroups: mappedModifierGroups,
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

  const [categoryValidationResult, productSlug] = await Promise.all([
    validateProductCategory(supabase, tenantId, payload.category),
    resolveUniqueSlug(supabase, tenantId, payload.name),
  ])

  if (!categoryValidationResult.ok) {
    return { ok: false, error: categoryValidationResult.error }
  }

  const insertResult = await supabase
    .from("products")
    .insert({
      id: options?.productId,
      tenant_id: tenantId,
      category_id: categoryValidationResult.categoryId,
      name: payload.name.trim(),
      slug: productSlug,
      description: payload.description.trim(),
      base_price: normalizedPrice,
      status: toCatalogDbStatus(payload.status),
      primary_image_path: payload.primaryImagePath?.trim() || null,
      primary_image_alt: payload.primaryImageAlt?.trim() || null,
      tags: ["New"],
    })
    .select("id")
    .single<{ id: string }>()

  if (insertResult.error) {
    return { ok: false, error: insertResult.error.message }
  }

  const branchOverridesResult = await upsertBranchProductOverrides(supabase, tenantId, insertResult.data.id, payload.branchOverrides)

  if (!branchOverridesResult.ok) {
    return branchOverridesResult
  }

  const variantsResult = await syncProductVariants(supabase, tenantId, insertResult.data.id, payload.variants)

  if (!variantsResult.ok) {
    return variantsResult
  }

  return { ok: true, entityId: insertResult.data.id }
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

  const [categoryValidationResult, productSlug] = await Promise.all([
    validateProductCategory(supabase, tenantId, payload.category),
    resolveUniqueSlug(supabase, tenantId, payload.name, productId),
  ])

  if (!categoryValidationResult.ok) {
    return { ok: false, error: categoryValidationResult.error }
  }

  const updateResult = await supabase
    .from("products")
    .update({
      category_id: categoryValidationResult.categoryId,
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

  const branchOverridesResult = await upsertBranchProductOverrides(supabase, tenantId, productId, payload.branchOverrides)

  if (!branchOverridesResult.ok) {
    return branchOverridesResult
  }

  const variantsResult = await syncProductVariants(supabase, tenantId, productId, payload.variants)

  if (!variantsResult.ok) {
    return variantsResult
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

  const insertResult = await supabase
    .from("products")
    .insert({
      tenant_id: tenantId,
      category_id: productResult.data.category_id,
      name: duplicateName,
      slug: duplicateSlug,
      description: productResult.data.description,
      base_price: productResult.data.base_price,
      status: "draft",
      tags: ["Copy"],
    })
    .select("id")
    .single<{ id: string }>()

  if (insertResult.error) {
    return { ok: false, error: insertResult.error.message }
  }

  const sourceOverridesResult = await supabase
    .from("branch_product_overrides")
    .select("branch_id, availability_status, price_override, prep_time_minutes")
    .eq("product_id", productId)
    .returns<Omit<BranchProductOverrideRow, "product_id">[]>()

  const branchOverrides = (sourceOverridesResult.data ?? []).map((override) => ({
    branchId: override.branch_id,
    availabilityStatus: override.availability_status,
    priceOverride: override.price_override == null ? "" : String(override.price_override),
    prepTimeMinutes: override.prep_time_minutes == null ? "" : String(override.prep_time_minutes),
  }))

  const branchOverridesResult = await upsertBranchProductOverrides(
    supabase,
    tenantId,
    insertResult.data.id,
    branchOverrides
  )

  if (!branchOverridesResult.ok) {
    return branchOverridesResult
  }

  const sourceVariantsResult = await supabase
    .from("product_variants")
    .select("name, base_price, is_default, sort_order")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .eq("is_active", true)
    .returns<Pick<ProductVariantRow, "name" | "base_price" | "is_default" | "sort_order">[]>()

  if (sourceVariantsResult.error) {
    return { ok: false, error: sourceVariantsResult.error.message }
  }

  const variantsResult = await syncProductVariants(
    supabase,
    tenantId,
    insertResult.data.id,
    (sourceVariantsResult.data ?? []).map((variant) => ({
      name: variant.name,
      basePrice: String(variant.base_price),
      isDefault: variant.is_default,
      sortOrder: variant.sort_order,
    }))
  )

  if (!variantsResult.ok) {
    return variantsResult
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
