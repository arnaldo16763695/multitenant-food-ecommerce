import { notFound } from "next/navigation"

import { TenantShell } from "@/components/marketing/tenant-shell"
import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getPublicStorefrontBySlug } from "@/lib/data/public-storefront"
import { getCustomerBagItems } from "@/lib/services/customer-bag"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

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
  const supabase = createSupabaseAdminClient()

  if (!storefront) {
    notFound()
  }

  const initialBagItems =
    customerContext && storefront.activeBranch?.id && supabase
      ? await getCustomerBagItems(supabase, storefront.tenant.slug, storefront.activeBranch.id, customerContext.customer.id)
      : []

  return (
    <TenantShell
      tenantSlug={storefront.tenant.slug}
      eyebrow="Tienda Pública"
      title={storefront.tenant.name}
      description=""
      requiresBranchSelection={storefront.branches.length > 1 && !requestedBranchId}
      activeBranchId={storefront.activeBranch?.id}
      activeBranchLabel={storefront.activeBranch?.name ?? "Sin sucursal activa"}
      branches={storefront.branches}
      etaMinutes={storefront.etaMinutes}
      heroImageUrl={storefront.activeBranch?.heroImageUrl ?? storefront.tenant.heroImageUrl}
      logoImageUrl={storefront.tenant.logoImageUrl}
      customerSession={customerContext}
      initialBagItems={initialBagItems}
      menu={storefront.menu}
      shareUrl={storefront.shareUrl}
    />
  )
}
