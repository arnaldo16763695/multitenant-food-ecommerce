import { notFound } from "next/navigation"

import { TenantShell } from "@/components/marketing/tenant-shell"
import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getPublicStorefrontBySlug } from "@/lib/data/public-storefront"

type TenantPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
  readonly searchParams: Promise<{
    branch?: string
  }>
}

export default async function TenantPage({ params, searchParams }: TenantPageProps) {
  const { tenantSlug } = await params
  const { branch: requestedBranchId } = await searchParams
  const storefront = await getPublicStorefrontBySlug(tenantSlug, requestedBranchId)
  const customerContext = await getCustomerAccountContext()

  if (!storefront) {
    notFound()
  }

  return (
    <TenantShell
      tenantSlug={storefront.tenant.slug}
      eyebrow="Public storefront"
      title={storefront.tenant.name}
      description="Comparte este storefront con tus clientes y llevalos directo a una experiencia de compra por sucursal, sin pasar por el admin ni por pasos extra."
      requiresBranchSelection={storefront.branches.length > 1 && !requestedBranchId}
      activeBranchId={storefront.activeBranch?.id}
      activeBranchLabel={storefront.activeBranch?.name ?? "Sin sucursal activa"}
      branches={storefront.branches}
      etaMinutes={storefront.etaMinutes}
      heroImageUrl={storefront.activeBranch?.heroImageUrl ?? storefront.tenant.heroImageUrl}
      logoImageUrl={storefront.tenant.logoImageUrl}
      customerSession={customerContext}
      menu={storefront.menu}
      shareUrl={storefront.shareUrl}
    />
  )
}
