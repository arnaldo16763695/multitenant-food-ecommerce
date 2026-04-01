import { AdminCatalogProducts } from "@/components/admin/admin-catalog"
import { getAdminCatalogModule } from "@/lib/data/admin-catalog"

type AdminCatalogProductsPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminCatalogProductsPage({ params }: AdminCatalogProductsPageProps) {
  const { tenantSlug } = await params
  const { products } = await getAdminCatalogModule(tenantSlug)

  return <AdminCatalogProducts initialProducts={products} />
}
