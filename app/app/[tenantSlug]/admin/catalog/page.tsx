import { AdminCatalogOverview } from "@/components/admin/admin-catalog-overview"

type AdminCatalogPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminCatalogPage({ params }: AdminCatalogPageProps) {
  const { tenantSlug } = await params

  return <AdminCatalogOverview tenantSlug={tenantSlug} />
}
