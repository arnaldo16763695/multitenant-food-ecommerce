import { featuredBrands } from "@/lib/config/platform"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type BranchRow = {
  id: string
  name: string
  hero_image_url: string | null
  address_line_1: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country_code: string | null
  latitude: number | null
  longitude: number | null
  tenants: {
    id: string
    name: string
    slug: string
    logo_image_url: string | null
    hero_image_url: string | null
    storefront_enabled: boolean
  } | null
}

export type NearbyBranch = {
  readonly id: string
  readonly name: string
  readonly heroImageUrl: string | null
  readonly addressLine1: string | null
  readonly city: string | null
  readonly state: string | null
  readonly postalCode: string | null
  readonly countryCode: string | null
  readonly latitude: number
  readonly longitude: number
  readonly distanceMeters: number
  readonly distanceKilometers: number
  readonly etaMinutes: number
  readonly storefrontHref: string
  readonly tenant: {
    readonly id: string
    readonly name: string
    readonly slug: string
    readonly logoImageUrl: string | null
    readonly heroImageUrl: string | null
    readonly cuisine: string | null
  }
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

export function haversineDistanceMeters(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const earthRadiusMeters = 6371000
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)
  const haversineComponent =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2)

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversineComponent), Math.sqrt(1 - haversineComponent))
}

function getFeaturedBrandMeta(tenantSlug: string) {
  return featuredBrands.find((brand) => brand.slug === tenantSlug) ?? null
}

export async function getNearbyBranches(input: {
  readonly latitude: number
  readonly longitude: number
  readonly limit?: number
  readonly maxDistanceKm?: number
}): Promise<readonly NearbyBranch[]> {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const branchesResult = await supabase
    .from("branches")
    .select(
      "id, name, hero_image_url, address_line_1, city, state, postal_code, country_code, latitude, longitude, tenants!inner(id, name, slug, logo_image_url, hero_image_url, storefront_enabled)"
    )
    .eq("is_active", true)
    .eq("tenants.storefront_enabled", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .returns<BranchRow[]>()

  if (branchesResult.error) {
    return []
  }

  const origin = {
    latitude: input.latitude,
    longitude: input.longitude,
  }
  const maxDistanceMeters = (input.maxDistanceKm ?? 25) * 1000
  const limit = Math.max(1, Math.min(input.limit ?? 20, 50))

  return (branchesResult.data ?? [])
    .flatMap((branch) => {
      if (!branch.tenants || branch.latitude == null || branch.longitude == null) {
        return []
      }

      const distanceMeters = haversineDistanceMeters(origin, {
        latitude: branch.latitude,
        longitude: branch.longitude,
      })

      if (distanceMeters > maxDistanceMeters) {
        return []
      }

      const featuredMeta = getFeaturedBrandMeta(branch.tenants.slug)

      return [
        {
          id: branch.id,
          name: branch.name,
          heroImageUrl: branch.hero_image_url ?? branch.tenants.hero_image_url,
          addressLine1: branch.address_line_1,
          city: branch.city,
          state: branch.state,
          postalCode: branch.postal_code,
          countryCode: branch.country_code,
          latitude: branch.latitude,
          longitude: branch.longitude,
          distanceMeters: Math.round(distanceMeters),
          distanceKilometers: Number((distanceMeters / 1000).toFixed(2)),
          etaMinutes: featuredMeta?.etaMinutes ?? 20,
          storefrontHref: `/app/${branch.tenants.slug}?branch=${branch.id}`,
          tenant: {
            id: branch.tenants.id,
            name: branch.tenants.name,
            slug: branch.tenants.slug,
            logoImageUrl: branch.tenants.logo_image_url,
            heroImageUrl: branch.tenants.hero_image_url,
            cuisine: featuredMeta?.cuisine ?? null,
          },
        } satisfies NearbyBranch,
      ]
    })
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, limit)
}
