import { StorefrontCheckoutView } from "@/components/marketing/storefront-checkout-view"
import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getPublicStorefrontBySlug } from "@/lib/data/public-storefront"

type StorefrontCheckoutPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function StorefrontCheckoutPage({ params }: StorefrontCheckoutPageProps) {
  const { tenantSlug } = await params
  const storefront = await getPublicStorefrontBySlug(tenantSlug)
  const customerContext = await getCustomerAccountContext()

  return (
    <StorefrontCheckoutView
      tenantSlug={tenantSlug}
      branchLabel={storefront?.suggestedBranch ?? "Sucursal activa"}
      customerSession={customerContext}
      customerDefaults={{
        fullName: customerContext?.customer.fullName,
        email: customerContext?.customer.email,
        phone: customerContext?.customer.phone,
      }}
    />
  )
}
