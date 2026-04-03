import { AdminCatalogCategories } from "@/components/admin/admin-catalog-categories"
import { getAdminCatalogModule } from "@/lib/data/admin-catalog"

type AdminCatalogCategoriesPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminCatalogCategoriesPage({ params }: AdminCatalogCategoriesPageProps) {
  const { tenantSlug } = await params
  const { categories } = await getAdminCatalogModule(tenantSlug)

  return <AdminCatalogCategories tenantSlug={tenantSlug} initialCategories={categories} />
}
