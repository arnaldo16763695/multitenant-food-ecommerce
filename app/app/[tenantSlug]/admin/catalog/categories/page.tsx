import { redirect } from "next/navigation"

import { AdminCatalogCategories } from "@/components/admin/admin-catalog-categories"
import { requireAdminAccess } from "@/lib/auth/admin"
import { canManageCatalogMaster } from "@/lib/auth/permissions"
import { getAdminCatalogModule } from "@/lib/data/admin-catalog"

type AdminCatalogCategoriesPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminCatalogCategoriesPage({ params }: AdminCatalogCategoriesPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogMaster(access.membership.role)) {
    redirect(`/app/${tenantSlug}/admin/catalog/products`)
  }

  const { categories } = await getAdminCatalogModule(tenantSlug)

  return <AdminCatalogCategories tenantSlug={tenantSlug} initialCategories={categories} />
}
