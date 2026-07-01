import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { requireAdminSectionAccess } from "@/lib/auth/admin-section"
import { getAdminOverviewMetrics } from "@/lib/services/orders"
import { getActiveBranchIdsForMembership } from "@/lib/services/staff"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type AdminOverviewPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminOverviewPage({ params }: AdminOverviewPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminSectionAccess(tenantSlug, "overview")
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const branchIds = access.membership.role === "owner" || access.membership.role === "manager" ? [] : await getActiveBranchIdsForMembership(supabase, access.membership.id)
  const metrics = await getAdminOverviewMetrics(supabase, access.membership.tenantId, {
    branchIds,
  })

  return <AdminDashboard tenantSlug={tenantSlug} metrics={metrics} />
}
