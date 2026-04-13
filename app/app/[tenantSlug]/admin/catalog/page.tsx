import { redirect } from "next/navigation"

import { AdminCatalogOverview } from "@/components/admin/admin-catalog-overview"
import { requireAdminAccess } from "@/lib/auth/admin"
import { canManageCatalogMaster } from "@/lib/auth/permissions"
import { getAdminCatalogModule } from "@/lib/data/admin-catalog"

type AdminCatalogPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminCatalogPage({ params }: AdminCatalogPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogMaster(access.membership.role)) {
    redirect(`/app/${tenantSlug}/admin/catalog/products`)
  }

  const catalogModule = await getAdminCatalogModule(tenantSlug)

  return <AdminCatalogOverview tenantSlug={tenantSlug} {...catalogModule} />
}
