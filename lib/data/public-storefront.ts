import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { type BranchOrderingMode } from "@/lib/domain/branch-schedule"
import { getBranchOperationalStatusMap } from "@/lib/services/branch-schedule"

const DEMO_STOREFRONT_SLUG = "demo-brand"

type StorefrontTenant = {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly customDomain: string | null
  readonly storefrontEnabled: boolean
  readonly heroImageUrl: string | null
  readonly logoImageUrl: string | null
}

type StorefrontBranch = {
  readonly id: string
  readonly name: string
  readonly heroImageUrl: string | null
  readonly isOpenNow: boolean
  readonly acceptingOrders: boolean
  readonly orderingMode: BranchOrderingMode
  readonly closureLabel: string | null
  readonly nextTransitionAt: string | null
  readonly nextTransitionLabel: string | null
}

type TenantProduct = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly basePrice: string
  readonly hasVariants: boolean
  readonly variants: readonly {
    id: string
    name: string
    basePrice: string
    isDefault: boolean
  }[]
  readonly modifierGroups: readonly {
    id: string
    name: string
    selectionType: "single" | "multiple"
    modifierKind: "ingredient" | "addon" | "choice"
    minSelect: number
    maxSelect: number
    options: readonly {
      id: string
      name: string
      priceDelta: number
      priceDeltaLabel: string
      defaultSelected: boolean
    }[]
  }[]
  readonly category: string
  readonly imageUrl: string | null
  readonly comboComponents: readonly {
    componentProductName: string
    componentVariantName: string | null
    quantity: number
  }[]
}

type PublicStorefrontData = {
  readonly tenant: StorefrontTenant
  readonly branches: readonly StorefrontBranch[]
  readonly activeBranch: StorefrontBranch | null
  readonly etaMinutes: number
  readonly menu: readonly TenantProduct[]
  readonly shareUrl: string
}

type TenantRow = {
  id: string
  name: string
  slug: string
  custom_domain: string | null
  storefront_enabled: boolean
  hero_image_url: string | null
  logo_image_url: string | null
}

type BranchRow = {
  id: string
  name: string
  hero_image_url: string | null
}

type ProductRow = {
  id: string
  name: string
  description: string
  base_price: number | string
  category_id: string | null
  primary_image_path: string | null
  status: "active" | "draft"
  is_combo: boolean
}

type ProductVariantRow = {
  id: string
  product_id: string
  name: string
  base_price: number | string
  is_default: boolean
  is_active: boolean
  sort_order: number
}

type CategoryRow = {
  id: string
  name: string
}

type ModifierGroupRow = {
  id: string
  name: string
  selection_type: "single" | "multiple"
  modifier_kind: "ingredient" | "addon" | "choice"
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
  default_selected: boolean
  sort_order: number
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

type ComboComponentAvailabilityRow = {
  combo_product_id: string
  component_product_id: string
  component_variant_id: string | null
  quantity: number
}

function getStoragePublicUrl(path: string | null) {
  if (!path) {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) {
    return null
  }

  return `${supabaseUrl}/storage/v1/object/public/catalog-media/${path}`
}

function formatCurrency(value: number | string) {
  return `$ ${Number(value).toFixed(2)}`
}

function buildShareUrl(tenant: StorefrontTenant) {
  return tenant.customDomain ? `https://${tenant.customDomain}` : `https://vzfood.com/app/${tenant.slug}`
}

function getDemoStorefrontData(): PublicStorefrontData {
  const tenant: StorefrontTenant = {
    id: DEMO_STOREFRONT_SLUG,
    name: "Demo Brand",
    slug: DEMO_STOREFRONT_SLUG,
    customDomain: null,
    storefrontEnabled: true,
    heroImageUrl: null,
    logoImageUrl: null,
  }
  const activeBranch: StorefrontBranch = {
    id: "demo-branch-centro",
    name: "Centro",
    heroImageUrl: null,
    isOpenNow: true,
    acceptingOrders: true,
    orderingMode: "force_open",
    closureLabel: null,
    nextTransitionAt: null,
    nextTransitionLabel: null,
  }

  return {
    tenant,
    branches: [activeBranch],
    activeBranch,
    etaMinutes: 18,
    menu: [
      {
        id: "demo-burger",
        name: "Classic Burger",
        description: "Pan brioche, carne a la plancha, queso y salsa de la casa.",
        basePrice: "$ 8.50",
        hasVariants: true,
        variants: [
          {
            id: "demo-burger-single",
            name: "Simple",
            basePrice: "$ 8.50",
            isDefault: true,
          },
          {
            id: "demo-burger-double",
            name: "Doble",
            basePrice: "$ 10.50",
            isDefault: false,
          },
        ],
        modifierGroups: [
          {
            id: "demo-sauces",
            name: "Salsas",
            selectionType: "single",
            modifierKind: "choice",
            minSelect: 1,
            maxSelect: 1,
            options: [
              {
                id: "demo-mayo",
                name: "Mayonesa de ajo",
                priceDelta: 0,
                priceDeltaLabel: "$ 0.00",
                defaultSelected: true,
              },
              {
                id: "demo-spicy",
                name: "Picante",
                priceDelta: 0.5,
                priceDeltaLabel: "$ 0.50",
                defaultSelected: false,
              },
            ],
          },
        ],
        category: "Burgers",
        imageUrl: null,
        comboComponents: [],
      },
      {
        id: "demo-fries",
        name: "Papas crujientes",
        description: "Papas doradas con sal marina y toque especiado.",
        basePrice: "$ 3.50",
        hasVariants: false,
        variants: [],
        modifierGroups: [],
        category: "Acompanantes",
        imageUrl: null,
        comboComponents: [],
      },
    ],
    shareUrl: buildShareUrl(tenant),
  }
}

function resolveActiveBranch(branches: readonly StorefrontBranch[], preferredBranchId?: string | null) {
  if (!branches.length) {
    return null
  }

  if (!preferredBranchId) {
    return branches[0]
  }

  return branches.find((branch) => branch.id === preferredBranchId) ?? branches[0]
}

export async function getPublicStorefrontBySlug(tenantSlug: string, preferredBranchId?: string | null): Promise<PublicStorefrontData | null> {
  if (tenantSlug === DEMO_STOREFRONT_SLUG) {
    return getDemoStorefrontData()
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return null
  }

  const tenantResult = await supabase
    .from("tenants")
    .select("id, name, slug, custom_domain, storefront_enabled, hero_image_url, logo_image_url")
    .eq("slug", tenantSlug)
    .limit(1)
    .maybeSingle<TenantRow>()

  if (tenantResult.error || !tenantResult.data || !tenantResult.data.storefront_enabled) {
    return null
  }

  const tenant: StorefrontTenant = {
    id: tenantResult.data.id,
    name: tenantResult.data.name,
    slug: tenantResult.data.slug,
    customDomain: tenantResult.data.custom_domain,
    storefrontEnabled: tenantResult.data.storefront_enabled,
    heroImageUrl: tenantResult.data.hero_image_url,
    logoImageUrl: tenantResult.data.logo_image_url,
  }

  const [branchesResult, categoriesResult, productsResult, productVariantsResult, modifierGroupsResult, productModifierGroupsResult, modifierGroupOptionsResult] = await Promise.all([
    supabase.from("branches").select("id, name, hero_image_url").eq("tenant_id", tenant.id).eq("is_active", true).order("name", { ascending: true }).returns<BranchRow[]>(),
    supabase.from("categories").select("id, name").eq("tenant_id", tenant.id).returns<CategoryRow[]>(),
    supabase
      .from("products")
      .select("id, name, description, base_price, category_id, primary_image_path, status, is_combo")
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .order("name", { ascending: true })
      .returns<ProductRow[]>(),
    supabase.from("product_variants").select("id, product_id, name, base_price, is_default, is_active, sort_order").eq("tenant_id", tenant.id).eq("is_active", true).order("sort_order", { ascending: true }).returns<ProductVariantRow[]>(),
    supabase.from("modifier_groups").select("id, name, selection_type, modifier_kind, min_select, max_select").eq("tenant_id", tenant.id).eq("is_active", true).returns<ModifierGroupRow[]>(),
    supabase.from("product_modifier_groups").select("product_id, modifier_group_id").returns<ProductModifierGroupRow[]>(),
    supabase.from("modifier_group_options").select("id, modifier_group_id, name, price_delta, default_selected, sort_order").eq("is_active", true).returns<ModifierGroupOptionRow[]>(),
  ])

  const branches = (branchesResult.data ?? []).map((branch) => ({
    id: branch.id,
    name: branch.name,
    heroImageUrl: branch.hero_image_url,
  }))

  const branchOperationalStatusMap = await getBranchOperationalStatusMap(
    supabase,
    branches.map((branch) => branch.id)
  )

  const mappedBranches = branches.map((branch) => {
    const status = branchOperationalStatusMap.get(branch.id)

    return {
      ...branch,
      isOpenNow: status?.isOpenNow ?? true,
      acceptingOrders: status?.acceptingOrders ?? true,
      orderingMode: status?.orderingMode ?? "force_open",
      closureLabel: status?.closureLabel ?? null,
      nextTransitionAt: status?.nextTransitionAt ?? null,
      nextTransitionLabel: status?.nextTransitionLabel ?? null,
    }
  })

  const activeBranch = resolveActiveBranch(mappedBranches, preferredBranchId)
  const categoryMap = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]))
  const products = productsResult.data ?? []
  const productVariants = productVariantsResult.data ?? []
  const modifierGroups = modifierGroupsResult.data ?? []
  const productModifierGroups = productModifierGroupsResult.data ?? []
  const modifierGroupOptions = modifierGroupOptionsResult.data ?? []
  const productIds = products.map((product) => product.id)
  const variantIds = productVariants.map((variant) => variant.id)

  const [branchOverridesResult, branchVariantOverridesResult, comboComponentsResult] = await Promise.all([
    activeBranch && productIds.length
      ? supabase
          .from("branch_product_overrides")
          .select("product_id, availability_status, price_override")
          .eq("branch_id", activeBranch.id)
          .in("product_id", productIds)
          .returns<BranchProductOverrideRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: BranchProductOverrideRow[]; error: null }),
    activeBranch && variantIds.length
      ? supabase
          .from("branch_product_variant_overrides")
          .select("product_variant_id, availability_status, price_override")
          .eq("branch_id", activeBranch.id)
          .in("product_variant_id", variantIds)
          .returns<BranchProductVariantOverrideRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: BranchProductVariantOverrideRow[]; error: null }),
    productIds.length
      ? supabase
          .from("product_combo_components")
          .select("combo_product_id, component_product_id, component_variant_id, quantity")
          .in("combo_product_id", productIds)
          .order("sort_order", { ascending: true })
          .returns<ComboComponentAvailabilityRow[]>()
      : Promise.resolve({ data: [], error: null } as { data: ComboComponentAvailabilityRow[]; error: null }),
  ])

  if (branchesResult.error || categoriesResult.error || productsResult.error || productVariantsResult.error || modifierGroupsResult.error || productModifierGroupsResult.error || modifierGroupOptionsResult.error || branchOverridesResult.error || branchVariantOverridesResult.error || comboComponentsResult.error) {
    return null
  }

  const branchOverrideMap = new Map((branchOverridesResult.data ?? []).map((override) => [override.product_id, override]))
  const branchVariantOverrideMap = new Map((branchVariantOverridesResult.data ?? []).map((override) => [override.product_variant_id, override]))
  const comboComponentsMap = (comboComponentsResult.data ?? []).reduce<Map<string, ComboComponentAvailabilityRow[]>>((map, component) => {
    const currentComponents = map.get(component.combo_product_id) ?? []
    map.set(component.combo_product_id, [...currentComponents, component])
    return map
  }, new Map())

  // A combo is available only when its own override (if any) says available AND every one of
  // its components resolves available -- reusing the same override maps already loaded above,
  // since combo components are just other products/variants of this same tenant+branch.
  function isComboComponentsAvailable(comboProductId: string) {
    const components = comboComponentsMap.get(comboProductId) ?? []

    return components.every((component) => {
      if (component.component_variant_id) {
        const variantOverride = branchVariantOverrideMap.get(component.component_variant_id)
        return variantOverride ? variantOverride.availability_status === "available" : true
      }

      const productOverride = branchOverrideMap.get(component.component_product_id)
      return productOverride ? productOverride.availability_status === "available" : true
    })
  }
  const modifierGroupMap = new Map(modifierGroups.map((group) => [group.id, group]))
  const productModifierGroupsMap = productModifierGroups.reduce<Map<string, string[]>>((map, relation) => {
    const currentGroups = map.get(relation.product_id) ?? []
    map.set(relation.product_id, [...currentGroups, relation.modifier_group_id])
    return map
  }, new Map())
  const modifierGroupOptionsMap = modifierGroupOptions.reduce<Map<string, ModifierGroupOptionRow[]>>((map, option) => {
    const currentOptions = map.get(option.modifier_group_id) ?? []
    map.set(option.modifier_group_id, [...currentOptions, option])
    return map
  }, new Map())
  const productVariantsMap = productVariants.reduce<Map<string, ProductVariantRow[]>>((map, variant) => {
    const currentVariants = map.get(variant.product_id) ?? []
    map.set(variant.product_id, [...currentVariants, variant])
    return map
  }, new Map())

  // Every combo component is itself a tenant product already fetched above -- no extra query
  // needed to resolve names for display.
  const productNameMap = new Map(products.map((product) => [product.id, product.name]))
  const variantNameMap = new Map(productVariants.map((variant) => [variant.id, variant.name]))

  function buildComboComponentsSnapshot(comboProductId: string) {
    return (comboComponentsMap.get(comboProductId) ?? []).map((component) => ({
      componentProductName: productNameMap.get(component.component_product_id) ?? "Producto",
      componentVariantName: component.component_variant_id ? variantNameMap.get(component.component_variant_id) ?? null : null,
      quantity: component.quantity,
    }))
  }

  const menu: TenantProduct[] = products
    .filter((product) => {
      const variantsForProduct = productVariantsMap.get(product.id) ?? []

      if (variantsForProduct.length > 0) {
        return variantsForProduct.some((variant) => {
          const variantOverride = branchVariantOverrideMap.get(variant.id)
          return variantOverride ? variantOverride.availability_status === "available" : true
        })
      }

      const branchOverride = branchOverrideMap.get(product.id)
      const baseAvailable = branchOverride ? branchOverride.availability_status === "available" : true

      if (!product.is_combo || !baseAvailable) {
        return baseAvailable
      }

      return isComboComponentsAvailable(product.id)
    })
    .map((product) => {
      const variantsForProduct = productVariantsMap.get(product.id) ?? []
      const branchOverride = branchOverrideMap.get(product.id)
      const visibleVariants = variantsForProduct
        .filter((variant) => {
          const variantOverride = branchVariantOverrideMap.get(variant.id)
          return variantOverride ? variantOverride.availability_status === "available" : true
        })
        .map((variant) => ({
          id: variant.id,
          name: variant.name,
          basePrice: formatCurrency(branchVariantOverrideMap.get(variant.id)?.price_override ?? variant.base_price),
          isDefault: variant.is_default,
        }))
      const effectiveBasePrice =
        visibleVariants.length > 0
          ? Number(
              [...visibleVariants]
                .map((variant) => Number(variant.basePrice.replace(/[^0-9.-]+/g, "")))
                .sort((left, right) => left - right)[0]
            )
          : Number(branchOverride?.price_override ?? product.base_price)

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: formatCurrency(effectiveBasePrice),
        hasVariants: visibleVariants.length > 0,
        variants: visibleVariants,
        modifierGroups: (productModifierGroupsMap.get(product.id) ?? [])
          .map((modifierGroupId) => modifierGroupMap.get(modifierGroupId))
          .filter((value): value is ModifierGroupRow => Boolean(value))
          .map((group) => ({
            id: group.id,
            name: group.name,
            selectionType: group.selection_type,
            modifierKind: group.modifier_kind,
            minSelect: group.min_select,
            maxSelect: group.max_select,
            options: (modifierGroupOptionsMap.get(group.id) ?? [])
              .sort((left, right) => left.sort_order - right.sort_order)
              .map((option) => ({
                id: option.id,
                name: option.name,
                priceDelta: Number(option.price_delta),
                priceDeltaLabel: formatCurrency(option.price_delta),
                defaultSelected: option.default_selected,
              })),
          })),
        category: product.category_id ? categoryMap.get(product.category_id) ?? "Menu" : "Menu",
        imageUrl: getStoragePublicUrl(product.primary_image_path),
        comboComponents: product.is_combo ? buildComboComponentsSnapshot(product.id) : [],
      }
    })

  return {
    tenant,
    branches: mappedBranches,
    activeBranch,
    etaMinutes: 20,
    menu,
    shareUrl: buildShareUrl(tenant),
  }
}

export async function getPublicStorefrontByDomain(host: string, preferredBranchId?: string | null): Promise<PublicStorefrontData | null> {
  const normalizedHost = host.toLowerCase().split(":")[0]
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return null
  }

  const tenantResult = await supabase
    .from("tenants")
    .select("slug")
    .eq("custom_domain", normalizedHost)
    .eq("storefront_enabled", true)
    .limit(1)
    .maybeSingle<{ slug: string }>()

  if (tenantResult.error || !tenantResult.data) {
    return null
  }

  return getPublicStorefrontBySlug(tenantResult.data.slug, preferredBranchId)
}
