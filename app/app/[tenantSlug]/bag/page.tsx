import { StorefrontBagView } from "@/components/marketing/storefront-bag-view"
import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getPublicStorefrontBySlug } from "@/lib/data/public-storefront"
import { getCustomerBagItems } from "@/lib/services/customer-bag"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type StorefrontBagPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
  readonly searchParams: Promise<{
    branch?: string
  }>
}

export default async function StorefrontBagPage({ params, searchParams }: StorefrontBagPageProps) {
  const { tenantSlug } = await params
  const { branch: requestedBranchId } = await searchParams
  const storefront = await getPublicStorefrontBySlug(tenantSlug, requestedBranchId)
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()
  const initialBagItems =
    customerContext && storefront?.activeBranch?.id && supabase
      ? await getCustomerBagItems(supabase, tenantSlug, storefront.activeBranch.id, customerContext.customer.id)
      : []

  return (
    <StorefrontBagView
      tenantSlug={tenantSlug}
      branchId={storefront?.activeBranch?.id ?? null}
      branchLabel={storefront?.activeBranch?.name ?? "Sucursal activa"}
      customerSession={customerContext}
      initialBagItems={initialBagItems}
    />
  )
}
