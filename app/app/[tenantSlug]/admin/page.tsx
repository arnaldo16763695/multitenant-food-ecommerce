import { redirect } from "next/navigation"

import { requireAdminAccess } from "@/lib/auth/admin"
import { getDefaultRouteForRole } from "@/lib/auth/permissions"

type AdminPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminAccess(tenantSlug)

  if (access.membership.role === "owner" && !access.tenant.onboardingCompletedAt) {
    redirect(`/app/${tenantSlug}/admin/onboarding`)
  }

  redirect(getDefaultRouteForRole(tenantSlug, access.membership.role))
}
