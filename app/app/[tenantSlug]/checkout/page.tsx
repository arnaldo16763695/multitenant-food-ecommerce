import { StorefrontCheckoutView } from "@/components/marketing/storefront-checkout-view"
import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getPublicStorefrontBySlug } from "@/lib/data/public-storefront"

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
  const storefront = await getPublicStorefrontBySlug(tenantSlug, requestedBranchId)
  const customerContext = await getCustomerAccountContext()

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
    />
  )
}
