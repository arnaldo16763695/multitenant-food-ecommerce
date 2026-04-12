import { AdminCatalogModifiers } from "@/components/admin/admin-catalog-modifiers"
import { requireAdminSectionAccess } from "@/lib/auth/admin-section"
import { getAdminCatalogModule } from "@/lib/data/admin-catalog"

type AdminCatalogModifiersPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminCatalogModifiersPage({ params }: AdminCatalogModifiersPageProps) {
  const { tenantSlug } = await params
  await requireAdminSectionAccess(tenantSlug, "catalog")
  const { modifierGroups } = await getAdminCatalogModule(tenantSlug)

  return <AdminCatalogModifiers initialModifierGroups={modifierGroups} />
}
