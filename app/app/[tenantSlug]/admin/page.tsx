import { redirect } from "next/navigation"

import { requireAdminAccess } from "@/lib/auth/admin"
import { getDefaultAdminSection } from "@/lib/auth/permissions"

type AdminPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminAccess(tenantSlug)

  redirect(`/app/${tenantSlug}/admin/${getDefaultAdminSection(access.membership.role)}`)
}
