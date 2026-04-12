import { AdminCatalogProducts } from "@/components/admin/admin-catalog"
import { requireAdminSectionAccess } from "@/lib/auth/admin-section"
import { getAdminCatalogModule } from "@/lib/data/admin-catalog"

type AdminCatalogProductsPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminCatalogProductsPage({ params }: AdminCatalogProductsPageProps) {
  const { tenantSlug } = await params
  await requireAdminSectionAccess(tenantSlug, "catalog")
  const { products, categories } = await getAdminCatalogModule(tenantSlug)

  return <AdminCatalogProducts tenantSlug={tenantSlug} initialProducts={products} initialCategories={categories} />
}
