import { redirect } from "next/navigation"

import { canAccessAdminSection } from "@/lib/auth/permissions"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type AdminAccessContext = {
  readonly user: {
    id: string
    email: string
  }
  readonly profile: {
    id: string
    fullName: string
    email: string
  }
  readonly membership: {
    id: string
    tenantId: string
    role: string
  }
  readonly tenant: {
    id: string
    slug: string
    onboardingCompletedAt: string | null
  }
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type TenantRow = {
  id: string
  slug: string
  onboarding_completed_at: string | null
}

type MembershipRow = {
  id: string
  tenant_id: string
  role: string
}

async function requireTenantMembershipAccess(tenantSlug: string, nextPath: string): Promise<AdminAccessContext> {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id || !user.email) {
    redirect(`/auth/admin/login?next=${encodeURIComponent(nextPath)}`)
  }

  const [profileResult, tenantResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("auth_user_id", user.id).limit(1).maybeSingle<ProfileRow>(),
    supabase.from("tenants").select("id, slug, onboarding_completed_at").eq("slug", tenantSlug).limit(1).maybeSingle<TenantRow>(),
  ])

  if (profileResult.error || !profileResult.data || tenantResult.error || !tenantResult.data) {
    redirect(`/auth/admin/login?next=${encodeURIComponent(nextPath)}&reason=access`)
  }

  const membershipResult = await supabase
    .from("tenant_memberships")
    .select("id, tenant_id, role")
    .eq("tenant_id", tenantResult.data.id)
    .eq("profile_id", profileResult.data.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<MembershipRow>()

  if (membershipResult.error || !membershipResult.data) {
    redirect(`/auth/admin/login?next=${encodeURIComponent(nextPath)}&reason=membership`)
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      id: profileResult.data.id,
      fullName: profileResult.data.full_name ?? "Admin User",
      email: profileResult.data.email ?? user.email,
    },
    membership: {
      id: membershipResult.data.id,
      tenantId: membershipResult.data.tenant_id,
      role: membershipResult.data.role,
    },
    tenant: {
      id: tenantResult.data.id,
      slug: tenantResult.data.slug,
      onboardingCompletedAt: tenantResult.data.onboarding_completed_at,
    },
  }
}

export async function requireAdminAccess(tenantSlug: string): Promise<AdminAccessContext> {
  return requireTenantMembershipAccess(tenantSlug, `/app/${tenantSlug}/admin`)
}

export async function requireKitchenAccess(tenantSlug: string): Promise<AdminAccessContext> {
  const access = await requireTenantMembershipAccess(tenantSlug, `/app/${tenantSlug}/kitchen`)

  // Source of truth for who can reach the kitchen board is the same role/section matrix the
  // admin sidebar uses (lib/auth/permissions.ts) -- owner, manager, branch_manager and preparer.
  if (!canAccessAdminSection(access.membership.role, "kitchen")) {
    redirect(`/app/${tenantSlug}/admin/overview?reason=kitchen-role`)
  }

  return access
}
