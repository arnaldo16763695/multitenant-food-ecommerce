import { redirect } from "next/navigation"

import { createSupabaseServerClient } from "@/lib/supabase/server"

import type { PlatformRole } from "@/lib/domain/platform-admin"

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type PlatformMembershipRow = {
  id: string
  role: PlatformRole
}

export type PlatformAccessContext = {
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
    role: PlatformRole
  }
}

export async function requirePlatformAccess(nextPath = "/platform"): Promise<PlatformAccessContext> {
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

  const profileResult = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("auth_user_id", user.id)
    .limit(1)
    .maybeSingle<ProfileRow>()

  if (profileResult.error || !profileResult.data) {
    redirect(`/auth/admin/login?next=${encodeURIComponent(nextPath)}&reason=platform-access`)
  }

  const membershipResult = await supabase
    .from("platform_memberships")
    .select("id, role")
    .eq("profile_id", profileResult.data.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<PlatformMembershipRow>()

  if (membershipResult.error || !membershipResult.data) {
    redirect(`/auth/admin/login?next=${encodeURIComponent(nextPath)}&reason=platform-membership`)
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      id: profileResult.data.id,
      fullName: profileResult.data.full_name ?? "Platform User",
      email: profileResult.data.email ?? user.email,
    },
    membership: {
      id: membershipResult.data.id,
      role: membershipResult.data.role,
    },
  }
}
