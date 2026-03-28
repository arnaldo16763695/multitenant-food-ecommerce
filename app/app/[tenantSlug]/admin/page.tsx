import { AdminDashboard } from "@/components/admin/admin-dashboard"

type AdminPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { tenantSlug } = await params

  return <AdminDashboard tenantSlug={tenantSlug} />
}
