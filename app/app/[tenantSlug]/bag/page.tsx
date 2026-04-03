import { StorefrontBagView } from "@/components/marketing/storefront-bag-view"

type StorefrontBagPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function StorefrontBagPage({ params }: StorefrontBagPageProps) {
  const { tenantSlug } = await params

  return <StorefrontBagView tenantSlug={tenantSlug} />
}
