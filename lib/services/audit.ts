import type { SupabaseClient } from "@supabase/supabase-js"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type AuditPayload = Record<string, unknown>

export type AuditActorSurface = "admin" | "kitchen" | "storefront" | "mobile_api" | "platform" | "system"

export type AuditActor = {
  readonly profileId: string | null
  readonly membershipId: string | null
  readonly name: string | null
  readonly role: string | null
  readonly surface: AuditActorSurface
}

export type AuditEventInput = {
  readonly tenantId?: string | null
  readonly branchId?: string | null
  readonly actor: AuditActor
  readonly entityType: string
  readonly entityId: string
  readonly action: string
  readonly summary: string
  readonly beforeData?: AuditPayload | null
  readonly afterData?: AuditPayload | null
  readonly metadata?: AuditPayload | null
}

type AuditEventRow = {
  id: string
  created_at: string
  actor_name: string | null
  actor_role: string | null
  actor_surface: AuditActorSurface
  entity_type: string
  entity_id: string
  action: string
  summary: string
  before_data: AuditPayload | null
  after_data: AuditPayload | null
  metadata: AuditPayload | null
}

export type AdminAuditEvent = {
  readonly id: string
  readonly createdAt: string
  readonly actorName: string | null
  readonly actorRole: string | null
  readonly actorSurface: AuditActorSurface
  readonly entityType: string
  readonly entityId: string
  readonly action: string
  readonly summary: string
  readonly beforeData: AuditPayload | null
  readonly afterData: AuditPayload | null
  readonly metadata: AuditPayload | null
}

export type AuditEventPage = {
  readonly items: readonly AdminAuditEvent[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly totalPages: number
}

export function buildAuditActor(input: {
  readonly surface: AuditActorSurface
  readonly profileId?: string | null
  readonly membershipId?: string | null
  readonly name?: string | null
  readonly role?: string | null
}): AuditActor {
  return {
    profileId: input.profileId ?? null,
    membershipId: input.membershipId ?? null,
    name: input.name?.trim() || null,
    role: input.role ?? null,
    surface: input.surface,
  }
}

function normalizePayload(payload?: AuditPayload | null) {
  if (!payload) {
    return null
  }

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function getFormatterParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })

  const parts = formatter.formatToParts(date)
  const getValue = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00"

  return {
    year: Number(getValue("year")),
    month: Number(getValue("month")),
    day: Number(getValue("day")),
    hour: Number(getValue("hour")),
    minute: Number(getValue("minute")),
    second: Number(getValue("second")),
  }
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const parts = getFormatterParts(date, timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - date.getTime()
}

function getUtcStartOfLocalDay(dateValue: string, timeZone: string) {
  const [year, month, day] = dateValue.split("-").map(Number)
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0, 0)
  const firstOffset = getTimeZoneOffsetMilliseconds(new Date(utcGuess), timeZone)
  let result = utcGuess - firstOffset
  const secondOffset = getTimeZoneOffsetMilliseconds(new Date(result), timeZone)

  if (secondOffset !== firstOffset) {
    result = utcGuess - secondOffset
  }

  return new Date(result)
}

function buildDateRange(filters?: { startDate?: string; endDate?: string; timeZone?: string }) {
  const timeZone = filters?.timeZone?.trim() || "UTC"
  const startDate = filters?.startDate?.trim()
  const endDate = filters?.endDate?.trim()

  if (!startDate && !endDate) {
    return null
  }

  const start = startDate ? getUtcStartOfLocalDay(startDate, timeZone) : null
  const endExclusive = endDate
    ? (() => {
        const end = new Date(getUtcStartOfLocalDay(endDate, timeZone))
        end.setUTCDate(end.getUTCDate() + 1)
        return end
      })()
    : null

  return {
    startIso: start?.toISOString() ?? null,
    endExclusiveIso: endExclusive?.toISOString() ?? null,
  }
}

export async function writeAuditEvent(supabase: SupabaseClient, input: AuditEventInput) {
  const auditClient = createSupabaseAdminClient() ?? supabase

  try {
    const insertResult = await auditClient.from("audit_events").insert({
      tenant_id: input.tenantId,
      branch_id: input.branchId ?? null,
      actor_profile_id: input.actor.profileId,
      actor_membership_id: input.actor.membershipId,
      actor_name: input.actor.name,
      actor_role: input.actor.role,
      actor_surface: input.actor.surface,
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      summary: input.summary,
      before_data: normalizePayload(input.beforeData),
      after_data: normalizePayload(input.afterData),
      metadata: normalizePayload(input.metadata),
    })

    if (insertResult.error) {
      console.error("Audit event write failed:", insertResult.error.message)
    }
  } catch (error) {
    console.error("Audit event write failed:", error)
  }
}

export async function getAdminAuditEvents(
  supabase: SupabaseClient,
  tenantId: string,
  filters?: {
    readonly query?: string
    readonly actor?: string
    readonly action?: string
    readonly surface?: AuditActorSurface | "all"
    readonly entityType?: string | "all"
    readonly entityId?: string
    readonly limit?: number
    readonly page?: number
    readonly pageSize?: number
    readonly startDate?: string
    readonly endDate?: string
    readonly timeZone?: string
  }
): Promise<AuditEventPage> {
  const page = Math.max(1, filters?.page ?? 1)
  const pageSize = Math.max(1, Math.min(filters?.pageSize ?? filters?.limit ?? 50, 100))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const dateRange = buildDateRange(filters)
  let query = supabase
    .from("audit_events")
    .select("id, created_at, actor_name, actor_role, actor_surface, entity_type, entity_id, action, summary, before_data, after_data, metadata", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (filters?.entityType && filters.entityType !== "all") {
    query = query.eq("entity_type", filters.entityType)
  }

  if (filters?.entityId?.trim()) {
    query = query.eq("entity_id", filters.entityId.trim())
  }

  if (filters?.actor?.trim()) {
    query = query.ilike("actor_name", `%${filters.actor.trim()}%`)
  }

  if (filters?.action?.trim()) {
    query = query.ilike("action", `%${filters.action.trim()}%`)
  }

  if (filters?.surface && filters.surface !== "all") {
    query = query.eq("actor_surface", filters.surface)
  }

  if (filters?.query?.trim()) {
    const normalizedQuery = filters.query.trim().replace(/,/g, " ")
    const queryFilters = [
      `summary.ilike.%${normalizedQuery}%`,
      `action.ilike.%${normalizedQuery}%`,
      `entity_type.ilike.%${normalizedQuery}%`,
      `actor_name.ilike.%${normalizedQuery}%`,
      `actor_role.ilike.%${normalizedQuery}%`,
    ]

    if (isUuidLike(normalizedQuery)) {
      queryFilters.push(`entity_id.eq.${normalizedQuery}`)
    }

    query = query.or(queryFilters.join(","))
  }

  if (dateRange?.startIso) {
    query = query.gte("created_at", dateRange.startIso)
  }

  if (dateRange?.endExclusiveIso) {
    query = query.lt("created_at", dateRange.endExclusiveIso)
  }

  const eventsResult = await query.returns<AuditEventRow[]>()

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message)
  }

  const items = (eventsResult.data ?? []).map((event) => ({
    id: event.id,
    createdAt: event.created_at,
    actorName: event.actor_name,
    actorRole: event.actor_role,
    actorSurface: event.actor_surface,
    entityType: event.entity_type,
    entityId: event.entity_id,
    action: event.action,
    summary: event.summary,
    beforeData: event.before_data,
    afterData: event.after_data,
    metadata: event.metadata,
  }))

  const total = eventsResult.count ?? 0

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getPlatformAuditEvents(
  supabase: SupabaseClient,
  filters?: {
    readonly query?: string
    readonly actor?: string
    readonly action?: string
    readonly surface?: AuditActorSurface | "all"
    readonly entityType?: string | "all"
    readonly entityId?: string
    readonly limit?: number
    readonly page?: number
    readonly pageSize?: number
    readonly startDate?: string
    readonly endDate?: string
    readonly timeZone?: string
  }
): Promise<AuditEventPage> {
  const page = Math.max(1, filters?.page ?? 1)
  const pageSize = Math.max(1, Math.min(filters?.pageSize ?? filters?.limit ?? 50, 100))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const dateRange = buildDateRange(filters)
  let query = supabase
    .from("audit_events")
    .select("id, created_at, actor_name, actor_role, actor_surface, entity_type, entity_id, action, summary, before_data, after_data, metadata", { count: "exact" })
    .is("tenant_id", null)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (filters?.entityType && filters.entityType !== "all") {
    query = query.eq("entity_type", filters.entityType)
  }

  if (filters?.entityId?.trim()) {
    query = query.eq("entity_id", filters.entityId.trim())
  }

  if (filters?.actor?.trim()) {
    query = query.ilike("actor_name", `%${filters.actor.trim()}%`)
  }

  if (filters?.action?.trim()) {
    query = query.ilike("action", `%${filters.action.trim()}%`)
  }

  if (filters?.surface && filters.surface !== "all") {
    query = query.eq("actor_surface", filters.surface)
  }

  if (filters?.query?.trim()) {
    const normalizedQuery = filters.query.trim().replace(/,/g, " ")
    const queryFilters = [
      `summary.ilike.%${normalizedQuery}%`,
      `action.ilike.%${normalizedQuery}%`,
      `entity_type.ilike.%${normalizedQuery}%`,
      `actor_name.ilike.%${normalizedQuery}%`,
      `actor_role.ilike.%${normalizedQuery}%`,
    ]

    if (isUuidLike(normalizedQuery)) {
      queryFilters.push(`entity_id.eq.${normalizedQuery}`)
    }

    query = query.or(queryFilters.join(","))
  }

  if (dateRange?.startIso) {
    query = query.gte("created_at", dateRange.startIso)
  }

  if (dateRange?.endExclusiveIso) {
    query = query.lt("created_at", dateRange.endExclusiveIso)
  }

  const eventsResult = await query.returns<AuditEventRow[]>()

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message)
  }

  const items = (eventsResult.data ?? []).map((event) => ({
    id: event.id,
    createdAt: event.created_at,
    actorName: event.actor_name,
    actorRole: event.actor_role,
    actorSurface: event.actor_surface,
    entityType: event.entity_type,
    entityId: event.entity_id,
    action: event.action,
    summary: event.summary,
    beforeData: event.before_data,
    afterData: event.after_data,
    metadata: event.metadata,
  }))

  const total = eventsResult.count ?? 0

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

function escapeCsvCell(value: string) {
  const normalizedValue = value.replace(/"/g, '""')
  return `"${normalizedValue}"`
}

export function serializeAuditEventsToCsv(events: readonly AdminAuditEvent[]) {
  const header = [
    "createdAt",
    "actorName",
    "actorRole",
    "actorSurface",
    "entityType",
    "entityId",
    "action",
    "summary",
    "beforeData",
    "afterData",
    "metadata",
  ]

  const rows = events.map((event) => [
    event.createdAt,
    event.actorName ?? "",
    event.actorRole ?? "",
    event.actorSurface,
    event.entityType,
    event.entityId,
    event.action,
    event.summary,
    JSON.stringify(event.beforeData ?? {}),
    JSON.stringify(event.afterData ?? {}),
    JSON.stringify(event.metadata ?? {}),
  ])

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(","))
    .join("\n")
}
