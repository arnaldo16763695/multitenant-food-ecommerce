import { NextResponse } from "next/server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAdminAuditEvents, serializeAuditEventsToCsv, type AuditActorSurface } from "@/lib/services/audit"

type AdminAuditExportRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

type ProfileRow = {
  id: string
}

type TenantRow = {
  id: string
}

type MembershipRow = {
  id: string
  role: string
}

const SURFACE_OPTIONS = ["all", "admin", "kitchen", "storefront", "mobile_api", "system"] as const
const ENTITY_OPTIONS = [
  "all",
  "order",
  "order_payment",
  "order_item",
  "staff_member",
  "catalog_product",
  "catalog_category",
  "catalog_modifier_group",
  "branch",
  "tenant_settings",
  "tenant_onboarding",
] as const

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

export async function GET(request: Request, context: AdminAuditExportRouteContext) {
  const { tenantSlug } = await context.params
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

  const [profileResult, tenantResult] = await Promise.all([
    supabase.from("profiles").select("id").eq("auth_user_id", user.id).limit(1).maybeSingle<ProfileRow>(),
    supabase.from("tenants").select("id").eq("slug", tenantSlug).limit(1).maybeSingle<TenantRow>(),
  ])

  if (profileResult.error || !profileResult.data || tenantResult.error || !tenantResult.data) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
  }

  const membershipResult = await supabase
    .from("tenant_memberships")
    .select("id, role")
    .eq("tenant_id", tenantResult.data.id)
    .eq("profile_id", profileResult.data.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<MembershipRow>()

  if (membershipResult.error || !membershipResult.data || (membershipResult.data.role !== "owner" && membershipResult.data.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const url = new URL(request.url)
  const events = await getAdminAuditEvents(supabase, tenantResult.data.id, {
    query: url.searchParams.get("q") ?? undefined,
    actor: url.searchParams.get("actor") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    surface: parseSurface(url.searchParams.get("surface")),
    entityType: parseEntityType(url.searchParams.get("entity")),
    entityId: url.searchParams.get("entityId") ?? undefined,
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
    limit: 1000,
  })

  return new NextResponse(serializeAuditEventsToCsv(events.items), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${tenantSlug}.csv"`,
    },
  })
}
