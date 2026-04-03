import { cache } from "react"

import { featuredBrands } from "@/lib/config/platform"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type StorefrontTenant = {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly customDomain: string | null
  readonly storefrontEnabled: boolean
}

type TenantProduct = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly basePrice: string
  readonly category: string
}

type PublicStorefrontData = {
  readonly tenant: StorefrontTenant
  readonly suggestedBranch: string
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
}

type ProductRow = {
  id: string
  name: string
  description: string
  base_price: number | string
  category_id: string | null
}

type CategoryRow = {
  id: string
  name: string
}

function formatCurrency(value: number | string) {
  return `$ ${Number(value).toFixed(2)}`
}

function getFallbackBrand(tenantSlug: string) {
  return featuredBrands.find((brand) => brand.slug === tenantSlug) ?? featuredBrands[0]
}

function buildShareUrl(tenant: StorefrontTenant) {
  return tenant.customDomain ? `https://${tenant.customDomain}` : `https://vzfood.com/app/${tenant.slug}`
}

export const getPublicStorefrontBySlug = cache(async (tenantSlug: string): Promise<PublicStorefrontData | null> => {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    const fallbackBrand = getFallbackBrand(tenantSlug)

    return {
      tenant: {
        id: fallbackBrand.id,
        name: fallbackBrand.name,
        slug: fallbackBrand.slug,
        customDomain: null,
        storefrontEnabled: true,
      },
      suggestedBranch: fallbackBrand.nearestBranch,
      etaMinutes: fallbackBrand.etaMinutes,
      menu: [
        {
          id: `${fallbackBrand.slug}-item-1`,
          name: "Smash de la casa",
          description: "Carne doble, queso fundido y salsa ahumada.",
          basePrice: "$ 11.90",
          category: "Burgers",
        },
      ],
      shareUrl: `https://vzfood.com/app/${fallbackBrand.slug}`,
    }
  }

  const tenantResult = await supabase
    .from("tenants")
    .select("id, name, slug, custom_domain, storefront_enabled")
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
  }

  const [branchesResult, categoriesResult, productsResult] = await Promise.all([
    supabase.from("branches").select("name").eq("tenant_id", tenant.id).eq("is_active", true).order("name", { ascending: true }).limit(1),
    supabase.from("categories").select("id, name").eq("tenant_id", tenant.id).returns<CategoryRow[]>(),
    supabase.from("products").select("id, name, description, base_price, category_id").eq("tenant_id", tenant.id).order("name", { ascending: true }).limit(6).returns<ProductRow[]>(),
  ])

  const categoryMap = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]))
  const menu: TenantProduct[] = (productsResult.data ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    basePrice: formatCurrency(product.base_price),
    category: product.category_id ? categoryMap.get(product.category_id) ?? "Menu" : "Menu",
  }))

  const fallbackBrand = getFallbackBrand(tenant.slug)

  return {
    tenant,
    suggestedBranch: branchesResult.data?.[0]?.name ?? fallbackBrand.nearestBranch,
    etaMinutes: fallbackBrand.etaMinutes,
    menu,
    shareUrl: buildShareUrl(tenant),
  }
})

export const getPublicStorefrontByDomain = cache(async (host: string): Promise<PublicStorefrontData | null> => {
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

  return getPublicStorefrontBySlug(tenantResult.data.slug)
})
