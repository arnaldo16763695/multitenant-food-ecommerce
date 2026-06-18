import { redirect } from "next/navigation"

import { AdminCatalogModifiers } from "@/components/admin/admin-catalog-modifiers"
import { requireAdminAccess } from "@/lib/auth/admin"
import { canManageCatalogMaster } from "@/lib/auth/permissions"
import { getAdminCatalogModule } from "@/lib/data/admin-catalog"

type AdminCatalogModifiersPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminCatalogModifiersPage({ params }: AdminCatalogModifiersPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogMaster(access.membership.role)) {
    redirect(`/app/${tenantSlug}/admin/catalog/products`)
  }

  const { modifierGroups } = await getAdminCatalogModule(tenantSlug)

  return <AdminCatalogModifiers tenantSlug={tenantSlug} initialModifierGroups={modifierGroups} />
}
