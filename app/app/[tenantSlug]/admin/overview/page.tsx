import { AdminDashboard } from "@/components/admin/admin-dashboard"

type AdminOverviewPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminOverviewPage({ params }: AdminOverviewPageProps) {
  const { tenantSlug } = await params

  return <AdminDashboard tenantSlug={tenantSlug} />
}
