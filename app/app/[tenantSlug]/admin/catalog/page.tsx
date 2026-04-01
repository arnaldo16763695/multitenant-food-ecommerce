import { AdminCatalogOverview } from "@/components/admin/admin-catalog-overview"
import { getAdminCatalogModule } from "@/lib/data/admin-catalog"

type AdminCatalogPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminCatalogPage({ params }: AdminCatalogPageProps) {
  const { tenantSlug } = await params
  const catalogModule = await getAdminCatalogModule(tenantSlug)

  return <AdminCatalogOverview tenantSlug={tenantSlug} {...catalogModule} />
}
