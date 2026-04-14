import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type StorefrontTenant = {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly customDomain: string | null
  readonly storefrontEnabled: boolean
  readonly heroImageUrl: string | null
}

type StorefrontBranch = {
  readonly id: string
  readonly name: string
}

type TenantProduct = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly basePrice: string
  readonly category: string
  readonly imageUrl: string | null
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
}

type BranchRow = {
  id: string
  name: string
}

type ProductRow = {
  id: string
  name: string
  description: string
  base_price: number | string
  category_id: string | null
  primary_image_path: string | null
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
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return null
  }

  const tenantResult = await supabase
    .from("tenants")
    .select("id, name, slug, custom_domain, storefront_enabled, hero_image_url")
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
  }

  const [branchesResult, categoriesResult, productsResult] = await Promise.all([
    supabase.from("branches").select("id, name").eq("tenant_id", tenant.id).eq("is_active", true).order("name", { ascending: true }).returns<BranchRow[]>(),
    supabase.from("categories").select("id, name").eq("tenant_id", tenant.id).returns<CategoryRow[]>(),
    supabase
      .from("products")
      .select("id, name, description, base_price, category_id, primary_image_path, status")
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .order("name", { ascending: true })
      .returns<ProductRow[]>(),
  ])

  const branches = (branchesResult.data ?? []).map((branch) => ({
    id: branch.id,
    name: branch.name,
  }))

  const activeBranch = resolveActiveBranch(branches, preferredBranchId)
  const categoryMap = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]))
  const products = productsResult.data ?? []

  const branchOverridesResult =
    activeBranch && products.length
      ? await supabase
          .from("branch_product_overrides")
          .select("product_id, availability_status, price_override")
          .eq("branch_id", activeBranch.id)
          .in(
            "product_id",
            products.map((product) => product.id)
          )
          .returns<BranchProductOverrideRow[]>()
      : { data: [], error: null }

  if (branchesResult.error || categoriesResult.error || productsResult.error || branchOverridesResult.error) {
    return null
  }

  const branchOverrideMap = new Map((branchOverridesResult.data ?? []).map((override) => [override.product_id, override]))

  const menu: TenantProduct[] = products
    .filter((product) => {
      const branchOverride = branchOverrideMap.get(product.id)
      return branchOverride ? branchOverride.availability_status === "available" : true
    })
    .map((product) => {
      const branchOverride = branchOverrideMap.get(product.id)

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: formatCurrency(branchOverride?.price_override ?? product.base_price),
        category: product.category_id ? categoryMap.get(product.category_id) ?? "Menu" : "Menu",
        imageUrl: getStoragePublicUrl(product.primary_image_path),
      }
    })

  return {
    tenant,
    branches,
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
