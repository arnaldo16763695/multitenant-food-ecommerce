import { redirect } from "next/navigation"

import { StorefrontCheckoutView } from "@/components/marketing/storefront-checkout-view"
import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getPublicStorefrontBySlug } from "@/lib/data/public-storefront"
import { getCustomerBagItems } from "@/lib/services/customer-bag"
import { getTenantManualPaymentSettingsBySlug } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type StorefrontCheckoutPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
  readonly searchParams: Promise<{
    branch?: string
  }>
}

export default async function StorefrontCheckoutPage({ params, searchParams }: StorefrontCheckoutPageProps) {
  const { tenantSlug } = await params
  const { branch: requestedBranchId } = await searchParams
  const customerContext = await getCustomerAccountContext()

  if (!customerContext) {
    const checkoutPath = requestedBranchId ? `/app/${tenantSlug}/checkout?branch=${requestedBranchId}` : `/app/${tenantSlug}/checkout`
    redirect(`/app/${tenantSlug}/account/login?reason=checkout-auth&next=${encodeURIComponent(checkoutPath)}`)
  }

  const storefront = await getPublicStorefrontBySlug(tenantSlug, requestedBranchId)
  const supabase = createSupabaseAdminClient()
  const initialBagItems = storefront?.activeBranch?.id && supabase ? await getCustomerBagItems(supabase, tenantSlug, storefront.activeBranch.id, customerContext.customer.id) : []
  const paymentSettings = supabase ? await getTenantManualPaymentSettingsBySlug(supabase, tenantSlug) : null

  return (
    <StorefrontCheckoutView
      tenantSlug={tenantSlug}
      branchId={storefront?.activeBranch?.id ?? null}
      branchLabel={storefront?.activeBranch?.name ?? "Sucursal activa"}
      customerSession={customerContext}
      customerDefaults={{
        fullName: customerContext?.customer.fullName,
        email: customerContext?.customer.email,
        phone: customerContext?.customer.phone,
      }}
      manualPaymentSettings={paymentSettings}
      initialBagItems={initialBagItems}
    />
  )
}
