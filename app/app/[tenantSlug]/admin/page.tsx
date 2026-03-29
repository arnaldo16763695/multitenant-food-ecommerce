import { redirect } from "next/navigation"

type AdminPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { tenantSlug } = await params

  redirect(`/app/${tenantSlug}/admin/overview`)
}
