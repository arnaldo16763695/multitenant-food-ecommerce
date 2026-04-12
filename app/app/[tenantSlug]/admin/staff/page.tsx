import { redirect } from "next/navigation"

import { AdminStaffManagement } from "@/components/admin/admin-staff-management"
import { requireAdminAccess } from "@/lib/auth/admin"
import { canManageStaff, getAdminStaffMembers, getStaffBranches } from "@/lib/services/staff"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type AdminStaffPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminStaffPage({ params }: AdminStaffPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  if (!canManageStaff(access.membership.role) && access.membership.role !== "branch_manager") {
    redirect(`/app/${tenantSlug}/admin/overview`)
  }

  const [staff, branches] = await Promise.all([
    getAdminStaffMembers(supabase, access.membership.tenantId),
    getStaffBranches(supabase, access.membership.tenantId),
  ])

  return (
    <AdminStaffManagement
      tenantSlug={tenantSlug}
      initialStaff={staff}
      branches={branches}
      canManage={canManageStaff(access.membership.role)}
    />
  )
}
