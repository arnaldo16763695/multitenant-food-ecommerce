import { featuredBrands } from "@/lib/config/platform"
import { getNearbyBranches, type NearbyBranch } from "@/lib/data/mobile-nearby-branches"
import { getPublicBrandsDirectory } from "@/lib/data/public-brands"

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

  return {
    heroBanners: buildHeroBanners({
      nearbyBranches,
      featuredBrands: featuredBrandsPayload,
    }),
    nearbyBranches,
    featuredBrands: featuredBrandsPayload,
  }
}
