import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type BranchDetailRow = {
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
  is_active: boolean
  tenants: {
    id: string
    name: string
    slug: string
    logo_image_url: string | null
    hero_image_url: string | null
    storefront_enabled: boolean
  } | null
}

export type MobileBranchDetail = {
  readonly id: string
  readonly name: string
  readonly heroImageUrl: string | null
  readonly addressLine1: string | null
  readonly city: string | null
  readonly state: string | null
  readonly postalCode: string | null
  readonly countryCode: string | null
  readonly latitude: number | null
  readonly longitude: number | null
  readonly isActive: boolean
  readonly storefrontHref: string | null
  readonly tenant: {
    readonly id: string
    readonly name: string
    readonly slug: string
    readonly logoImageUrl: string | null
    readonly heroImageUrl: string | null
    readonly storefrontEnabled: boolean
  }
}

export async function getMobileBranchDetail(branchId: string): Promise<MobileBranchDetail | null> {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return null
  }

  const branchResult = await supabase
    .from("branches")
    .select(
      "id, name, hero_image_url, address_line_1, city, state, postal_code, country_code, latitude, longitude, is_active, tenants!inner(id, name, slug, logo_image_url, hero_image_url, storefront_enabled)"
    )
    .eq("id", branchId)
    .limit(1)
    .maybeSingle<BranchDetailRow>()

  if (branchResult.error || !branchResult.data || !branchResult.data.tenants) {
    return null
  }

  return {
    id: branchResult.data.id,
    name: branchResult.data.name,
    heroImageUrl: branchResult.data.hero_image_url ?? branchResult.data.tenants.hero_image_url,
    addressLine1: branchResult.data.address_line_1,
    city: branchResult.data.city,
    state: branchResult.data.state,
    postalCode: branchResult.data.postal_code,
    countryCode: branchResult.data.country_code,
    latitude: branchResult.data.latitude,
    longitude: branchResult.data.longitude,
    isActive: branchResult.data.is_active,
    storefrontHref: branchResult.data.tenants.storefront_enabled ? `/app/${branchResult.data.tenants.slug}?branch=${branchResult.data.id}` : null,
    tenant: {
      id: branchResult.data.tenants.id,
      name: branchResult.data.tenants.name,
      slug: branchResult.data.tenants.slug,
      logoImageUrl: branchResult.data.tenants.logo_image_url,
      heroImageUrl: branchResult.data.tenants.hero_image_url,
      storefrontEnabled: branchResult.data.tenants.storefront_enabled,
    },
  }
}
