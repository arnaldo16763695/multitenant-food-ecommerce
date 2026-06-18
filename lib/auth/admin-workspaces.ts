import type { SupabaseClient } from "@supabase/supabase-js"

import { getDefaultRouteForRole } from "@/lib/auth/permissions"
import type { PlatformRole } from "@/lib/domain/platform-admin"

export const LAST_ADMIN_WORKSPACE_STORAGE_KEY = "vz-food-last-admin-workspace"

type ProfileRow = {
  id: string
}

type PlatformMembershipRow = {
  role: PlatformRole
}

type TenantMembershipRow = {
  role: string
  tenants: {
    slug: string
    onboarding_completed_at: string | null
  } | null
}

export type AdminWorkspaceOption = {
  readonly key: string
  readonly label: string
  readonly description: string
  readonly href: string
  readonly kind: "platform" | "tenant"
}

export async function getAdminWorkspaceOptions(supabase: SupabaseClient, authUserId: string): Promise<readonly AdminWorkspaceOption[]> {
  const profileResult = await supabase.from("profiles").select("id").eq("auth_user_id", authUserId).limit(1).maybeSingle<ProfileRow>()

  if (profileResult.error || !profileResult.data) {
    return []
  }

  const [platformMembershipsResult, tenantMembershipsResult] = await Promise.all([
    supabase.from("platform_memberships").select("role").eq("profile_id", profileResult.data.id).eq("is_active", true).returns<PlatformMembershipRow[]>(),
    supabase
      .from("tenant_memberships")
      .select("role, tenants!inner(slug, onboarding_completed_at)")
      .eq("profile_id", profileResult.data.id)
      .eq("is_active", true)
      .returns<TenantMembershipRow[]>(),
  ])

  if (platformMembershipsResult.error || tenantMembershipsResult.error) {
    return []
  }

  const platformOptions: AdminWorkspaceOption[] = (platformMembershipsResult.data ?? []).map((membership) => ({
    key: `platform:${membership.role}`,
    label: "VZ Platform",
    description: membership.role === "platform_owner" ? "Panel SaaS con control global de tenants y signups." : "Panel SaaS con acceso global de operación.",
    href: "/platform",
    kind: "platform",
  }))

  const tenantOptions: AdminWorkspaceOption[] = (tenantMembershipsResult.data ?? []).flatMap((membership) => {
    if (!membership.tenants?.slug) {
      return []
    }

    const href = membership.role === "owner" && !membership.tenants.onboarding_completed_at ? `/app/${membership.tenants.slug}/admin/onboarding` : getDefaultRouteForRole(membership.tenants.slug, membership.role)

    return [
      {
        key: `tenant:${membership.tenants.slug}:${membership.role}`,
        label: membership.tenants.slug,
        description: `Tenant admin (${membership.role})`,
        href,
        kind: "tenant",
      },
    ]
  })

  return [...platformOptions, ...tenantOptions]
}

export function resolvePreferredAdminWorkspace(options: readonly AdminWorkspaceOption[], lastWorkspaceHref?: string | null) {
  if (options.length === 0) {
    return null
  }

  if (options.length === 1) {
    return options[0].href
  }

  const preferredOption = lastWorkspaceHref ? options.find((option) => option.href === lastWorkspaceHref) : undefined

  return preferredOption?.href ?? null
}
