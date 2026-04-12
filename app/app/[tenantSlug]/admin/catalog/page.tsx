import { AdminCatalogOverview } from "@/components/admin/admin-catalog-overview"
import { requireAdminSectionAccess } from "@/lib/auth/admin-section"
import { getAdminCatalogModule } from "@/lib/data/admin-catalog"

type AdminCatalogPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminCatalogPage({ params }: AdminCatalogPageProps) {
  const { tenantSlug } = await params
  await requireAdminSectionAccess(tenantSlug, "catalog")
  const catalogModule = await getAdminCatalogModule(tenantSlug)

  return <AdminCatalogOverview tenantSlug={tenantSlug} {...catalogModule} />
}
