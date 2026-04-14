import { cache } from "react"

import { featuredBrands } from "@/lib/config/platform"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type BrandDirectoryItem = {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly cuisine: string
  readonly headline: string
  readonly nearestBranch: string
  readonly etaMinutes: number
  readonly accent: string
  readonly heroImageUrl: string | null
  readonly storefrontHref: string
  readonly activeBranchCount: number
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
  tenant_id: string
  name: string
  is_active: boolean
}

function getFeaturedBrandMeta(tenantSlug: string) {
  return featuredBrands.find((brand) => brand.slug === tenantSlug) ?? null
}

function buildAccent(index: number) {
  const accents = [
    "from-orange-500 via-red-500 to-amber-300",
    "from-yellow-400 via-orange-400 to-red-500",
    "from-emerald-500 via-lime-400 to-teal-300",
    "from-sky-500 via-cyan-400 to-blue-300",
  ] as const

  return accents[index % accents.length]
}

export const getPublicBrandsDirectory = cache(async (): Promise<readonly BrandDirectoryItem[]> => {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const [tenantsResult, branchesResult] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name, slug, custom_domain, storefront_enabled, hero_image_url")
      .eq("storefront_enabled", true)
      .order("name", { ascending: true })
      .returns<TenantRow[]>(),
    supabase
      .from("branches")
      .select("id, tenant_id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .returns<BranchRow[]>(),
  ])

  if (tenantsResult.error || branchesResult.error) {
    return []
  }

  const tenants = tenantsResult.data ?? []
  const branches = branchesResult.data ?? []

  if (!tenants.length) {
    return []
  }

  const branchesByTenant = branches.reduce<Map<string, BranchRow[]>>((map, branch) => {
    const currentBranches = map.get(branch.tenant_id) ?? []
    map.set(branch.tenant_id, [...currentBranches, branch])
    return map
  }, new Map())

  return tenants.map((tenant, index) => {
    const tenantBranches = branchesByTenant.get(tenant.id) ?? []
    const firstActiveBranch = tenantBranches[0] ?? null
    const featuredMeta = getFeaturedBrandMeta(tenant.slug)
    const nearestBranch =
      firstActiveBranch?.name ??
      featuredMeta?.nearestBranch ??
      (tenantBranches.length ? `${tenantBranches.length} sucursales activas` : "Sin sucursales activas")

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      cuisine: featuredMeta?.cuisine ?? "Fast casual",
      headline:
        featuredMeta?.headline ??
        (tenantBranches.length > 1
          ? "Marca operando con multiples sucursales y storefront publico listo para dirigir al cliente al flujo correcto."
          : "Storefront publico listo para recibir pedidos con contexto real de sucursal."),
      nearestBranch,
      etaMinutes: featuredMeta?.etaMinutes ?? 20,
      accent: featuredMeta?.accent ?? buildAccent(index),
      heroImageUrl: tenant.hero_image_url ?? featuredMeta?.heroImageUrl ?? null,
      storefrontHref: firstActiveBranch ? `/app/${tenant.slug}?branch=${firstActiveBranch.id}` : `/app/${tenant.slug}`,
      activeBranchCount: tenantBranches.length,
    } satisfies BrandDirectoryItem
  })
})
