import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { requireAdminSectionAccess } from "@/lib/auth/admin-section"

type AdminOverviewPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminOverviewPage({ params }: AdminOverviewPageProps) {
  const { tenantSlug } = await params
  await requireAdminSectionAccess(tenantSlug, "overview")

  return <AdminDashboard tenantSlug={tenantSlug} />
}
