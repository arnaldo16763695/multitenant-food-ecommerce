import { redirect } from "next/navigation"

import { AdminCatalogProducts } from "@/components/admin/admin-catalog"
import { requireAdminAccess } from "@/lib/auth/admin"
import { canManageCatalogBranchOverrides } from "@/lib/auth/permissions"
import { getAdminCatalogModule } from "@/lib/data/admin-catalog"
import { getActiveBranchesForMembership } from "@/lib/services/staff"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type AdminCatalogProductsPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminCatalogProductsPage({ params }: AdminCatalogProductsPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogBranchOverrides(access.membership.role)) {
    redirect(`/app/${tenantSlug}/admin/overview?reason=catalog-role`)
  }

  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const { products, categories, branches, modifierGroups } = await getAdminCatalogModule(tenantSlug)
  const allowedBranches =
    access.membership.role === "branch_manager"
      ? await getActiveBranchesForMembership(supabase, access.membership.id)
      : branches

  return (
    <AdminCatalogProducts
      tenantSlug={tenantSlug}
      initialProducts={products}
      initialCategories={categories}
      initialBranches={allowedBranches}
      initialModifierGroups={modifierGroups}
      role={access.membership.role}
    />
  )
}
