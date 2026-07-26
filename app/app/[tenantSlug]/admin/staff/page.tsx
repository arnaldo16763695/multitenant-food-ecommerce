import { redirect } from "next/navigation"

import { getAdminAuditEvents } from "@/lib/services/audit"
import { AdminStaffManagement } from "@/components/admin/admin-staff-management"
import { requireAdminSectionAccess } from "@/lib/auth/admin-section"
import { canManageStaff, getAdminStaffMembers, getStaffBranches } from "@/lib/services/staff"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type AdminStaffPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminStaffPage({ params }: AdminStaffPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminSectionAccess(tenantSlug, "staff")
  const supabase = canManageStaff(access.membership.role) ? createSupabaseAdminClient() : await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  if (!canManageStaff(access.membership.role) && access.membership.role !== "branch_manager") {
    redirect(`/app/${tenantSlug}/admin/overview`)
  }

  const [staff, branches, staffAuditEvents] = await Promise.all([
    getAdminStaffMembers(supabase, access.membership.tenantId),
    getStaffBranches(supabase, access.membership.tenantId),
    getAdminAuditEvents(supabase, access.membership.tenantId, {
      entityType: "staff_member",
      limit: 80,
    }),
  ])

  return (
    <AdminStaffManagement
      tenantSlug={tenantSlug}
      initialStaff={staff}
      initialAuditEvents={staffAuditEvents.items}
      branches={branches}
      canManage={canManageStaff(access.membership.role)}
    />
  )
}
