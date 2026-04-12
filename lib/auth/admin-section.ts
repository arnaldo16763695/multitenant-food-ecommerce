import { redirect } from "next/navigation"

import { canAccessAdminSection, getDefaultAdminSection, type AdminSection } from "@/lib/auth/permissions"

import { requireAdminAccess } from "@/lib/auth/admin"

export async function requireAdminSectionAccess(tenantSlug: string, section: AdminSection) {
  const access = await requireAdminAccess(tenantSlug)

  if (!canAccessAdminSection(access.membership.role, section)) {
    redirect(`/app/${tenantSlug}/admin/${getDefaultAdminSection(access.membership.role)}`)
  }

  return access
}
