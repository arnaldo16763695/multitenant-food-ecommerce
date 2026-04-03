import { notFound } from "next/navigation"

import { TenantShell } from "@/components/marketing/tenant-shell"
import { getPublicStorefrontBySlug } from "@/lib/data/public-storefront"

type TenantPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { tenantSlug } = await params
  const storefront = await getPublicStorefrontBySlug(tenantSlug)

  if (!storefront) {
    notFound()
  }

  return (
    <TenantShell
      tenantSlug={storefront.tenant.slug}
      eyebrow="Public storefront"
      title={storefront.tenant.name}
      description="Comparte este storefront con tus clientes y llévalos directo a una experiencia de compra por sucursal, sin pasar por el admin ni por pasos extra."
      suggestedBranch={storefront.suggestedBranch}
      etaMinutes={storefront.etaMinutes}
      heroImageUrl={storefront.tenant.heroImageUrl}
      menu={storefront.menu}
      shareUrl={storefront.shareUrl}
    />
  )
}
