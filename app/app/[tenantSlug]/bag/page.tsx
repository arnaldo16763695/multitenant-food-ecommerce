import { StorefrontBagView } from "@/components/marketing/storefront-bag-view"
import { getCustomerAccountContext } from "@/lib/auth/customer"

type StorefrontBagPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function StorefrontBagPage({ params }: StorefrontBagPageProps) {
  const { tenantSlug } = await params
  const customerContext = await getCustomerAccountContext()

  return <StorefrontBagView tenantSlug={tenantSlug} customerSession={customerContext} />
}
