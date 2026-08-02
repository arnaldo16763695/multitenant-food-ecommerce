import { featuredBrands } from "@/lib/config/platform"
import { getNearbyBranches, type NearbyBranch } from "@/lib/data/mobile-nearby-branches"
import { getPublicBrandsDirectory } from "@/lib/data/public-brands"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type MobileHomeHeroBanner = {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly imageUrl: string | null
  readonly tenantSlug: string
  readonly branchId: string | null
  readonly ctaLabel: string
  readonly ctaHref: string
}

export type MobileHomeBrand = {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly cuisine: string
  readonly headline: string
  readonly etaMinutes: number
  readonly heroImageUrl: string | null
  readonly logoImageUrl: string | null
  readonly storefrontHref: string
}

export type MobileHomePayload = {
  readonly heroBanners: readonly MobileHomeHeroBanner[]
  readonly nearbyBranches: readonly NearbyBranch[]
  readonly featuredBrands: readonly MobileHomeBrand[]
}

async function getManualHeroBanners(): Promise<readonly MobileHomeHeroBanner[]> {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const nowIso = new Date().toISOString()
  const bannersResult = await supabase
    .from("mobile_home_banners")
    .select("id, title, subtitle, image_url, cta_label, tenant_id, branch_id, tenants!inner(slug, storefront_enabled)")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<{
      id: string
      title: string
      subtitle: string
      image_url: string | null
      cta_label: string
      tenant_id: string
      branch_id: string | null
      tenants: {
        slug: string
        storefront_enabled: boolean
      } | null
    }[]>()

  if (bannersResult.error) {
    return []
  }

  return (bannersResult.data ?? []).flatMap((banner) => {
    if (!banner.tenants?.storefront_enabled) {
      return []
    }

    const ctaHref = banner.branch_id ? `/app/${banner.tenants.slug}?branch=${banner.branch_id}` : `/app/${banner.tenants.slug}`

    return [
      {
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: banner.image_url,
        tenantSlug: banner.tenants.slug,
        branchId: banner.branch_id,
        ctaLabel: banner.cta_label,
        ctaHref,
      } satisfies MobileHomeHeroBanner,
    ]
  })
}

function buildHeroBanners(input: {
  readonly nearbyBranches: readonly NearbyBranch[]
  readonly featuredBrands: readonly MobileHomeBrand[]
}): readonly MobileHomeHeroBanner[] {
  const nearbyBanners = input.nearbyBranches.slice(0, 3).map((branch) => ({
    id: `nearby-${branch.id}`,
    title: `${branch.tenant.name} cerca de ti`,
    subtitle: `${branch.name} a ${branch.distanceKilometers.toFixed(1)} km · ETA ${branch.etaMinutes} min`,
    imageUrl: branch.heroImageUrl ?? branch.tenant.heroImageUrl,
    tenantSlug: branch.tenant.slug,
    branchId: branch.id,
    ctaLabel: "Ver sucursal",
    ctaHref: branch.storefrontHref,
  }))

  const featuredFallbackBanners = input.featuredBrands.slice(0, 3).map((brand) => ({
    id: `featured-${brand.slug}`,
    title: brand.name,
    subtitle: brand.headline,
    imageUrl: brand.heroImageUrl,
    tenantSlug: brand.slug,
    branchId: null,
    ctaLabel: "Abrir tienda",
    ctaHref: brand.storefrontHref,
  }))

  return nearbyBanners.length > 0 ? nearbyBanners : featuredFallbackBanners
}

export async function getMobileHome(input?: {
  readonly latitude?: number
  readonly longitude?: number
}): Promise<MobileHomePayload> {
  const brands = await getPublicBrandsDirectory()
  const featuredBrandsPayload = brands
    .filter((brand) => featuredBrands.some((featuredBrand) => featuredBrand.slug === brand.slug))
    .slice(0, 8)
    .map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      cuisine: brand.cuisine,
      headline: brand.headline,
      etaMinutes: brand.etaMinutes,
      heroImageUrl: brand.heroImageUrl,
      logoImageUrl: brand.logoImageUrl,
      storefrontHref: brand.storefrontHref,
    }))

  const nearbyBranches =
    input?.latitude != null && input?.longitude != null
      ? await getNearbyBranches({
          latitude: input.latitude,
          longitude: input.longitude,
          limit: 10,
        })
      : []
  const manualHeroBanners = await getManualHeroBanners()

  return {
    heroBanners:
      manualHeroBanners.length > 0
        ? manualHeroBanners
        : buildHeroBanners({
            nearbyBranches,
            featuredBrands: featuredBrandsPayload,
          }),
    nearbyBranches,
    featuredBrands: featuredBrandsPayload,
  }
}
