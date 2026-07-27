import { NextResponse } from "next/server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPlatformAuditEvents, serializeAuditEventsToCsv, type AuditActorSurface } from "@/lib/services/audit"

type ProfileRow = {
  id: string
}

type PlatformMembershipRow = {
  id: string
}

const SURFACE_OPTIONS = ["all", "platform", "system"] as const
const ENTITY_OPTIONS = ["all", "platform_signup", "platform_tenant"] as const

function parseSurface(value: string | null): AuditActorSurface | "all" {
  return SURFACE_OPTIONS.includes((value ?? "all") as (typeof SURFACE_OPTIONS)[number])
    ? ((value ?? "all") as AuditActorSurface | "all")
    : "all"
}

function parseEntityType(value: string | null) {
  return ENTITY_OPTIONS.includes((value ?? "all") as (typeof ENTITY_OPTIONS)[number])
    ? ((value ?? "all") as (typeof ENTITY_OPTIONS)[number])
    : "all"
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const profileResult = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).limit(1).maybeSingle<ProfileRow>()

  if (profileResult.error || !profileResult.data) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  const membershipResult = await supabase
    .from("platform_memberships")
    .select("id")
    .eq("profile_id", profileResult.data.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<PlatformMembershipRow>()

  if (membershipResult.error || !membershipResult.data) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const url = new URL(request.url)
  const events = await getPlatformAuditEvents(supabase, {
    query: url.searchParams.get("q") ?? undefined,
    actor: url.searchParams.get("actor") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    surface: parseSurface(url.searchParams.get("surface")),
    entityType: parseEntityType(url.searchParams.get("entity")),
    entityId: url.searchParams.get("entityId") ?? undefined,
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
    timeZone: url.searchParams.get("timeZone") ?? undefined,
    limit: 1000,
  })

  return new NextResponse(serializeAuditEventsToCsv(events.items), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="platform-audit.csv"',
    },
  })
}
