import Link from "next/link"
import type { ComponentProps } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePlatformAccess } from "@/lib/auth/platform"
import { getPlatformAuditEvents, type AuditActorSurface } from "@/lib/services/audit"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type PlatformAuditPageProps = {
  readonly searchParams: Promise<{
    q?: string
    actor?: string
    action?: string
    surface?: string
    entity?: string
    entityId?: string
    startDate?: string
    endDate?: string
    page?: string
  }>
}

const DEFAULT_PAGE_SIZE = 50

const SURFACE_OPTIONS = ["all", "platform", "system"] as const
const ENTITY_OPTIONS = ["all", "platform_signup", "platform_tenant"] as const

function parseSurface(value?: string): AuditActorSurface | "all" {
  return SURFACE_OPTIONS.includes((value ?? "all") as (typeof SURFACE_OPTIONS)[number])
    ? ((value ?? "all") as AuditActorSurface | "all")
    : "all"
}

function parseEntityType(value?: string) {
  return ENTITY_OPTIONS.includes((value ?? "all") as (typeof ENTITY_OPTIONS)[number])
    ? ((value ?? "all") as (typeof ENTITY_OPTIONS)[number])
    : "all"
}

function getSurfaceBadgeVariant(surface: AuditActorSurface): ComponentProps<typeof Badge>["variant"] {
  return surface === "platform" ? "default" : "warning"
}

function formatSurfaceLabel(surface: AuditActorSurface) {
  return surface === "platform" ? "Platform" : "System"
}

function formatEntityLabel(entityType: string) {
  if (entityType === "platform_signup") return "Signup"
  if (entityType === "platform_tenant") return "Tenant"
  return entityType
}

function parsePage(value?: string) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.floor(parsedValue) : 1
}

export default async function PlatformAuditPage({ searchParams }: PlatformAuditPageProps) {
  await requirePlatformAccess("/platform/audit")
  const { q, actor, action, surface, entity, entityId, startDate, endDate, page } = await searchParams
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const selectedSurface = parseSurface(surface)
  const selectedEntityType = parseEntityType(entity)
  const currentPage = parsePage(page)
  const exportParams = new URLSearchParams()

  if (q?.trim()) exportParams.set("q", q.trim())
  if (actor?.trim()) exportParams.set("actor", actor.trim())
  if (action?.trim()) exportParams.set("action", action.trim())
  if (entityId?.trim()) exportParams.set("entityId", entityId.trim())
  if (selectedSurface !== "all") exportParams.set("surface", selectedSurface)
  if (selectedEntityType !== "all") exportParams.set("entity", selectedEntityType)
  if (startDate?.trim()) exportParams.set("startDate", startDate.trim())
  if (endDate?.trim()) exportParams.set("endDate", endDate.trim())

  const auditPage = await getPlatformAuditEvents(supabase, {
    query: q,
    actor,
    action,
    surface: selectedSurface,
    entityType: selectedEntityType,
    entityId,
    startDate,
    endDate,
    page: currentPage,
    pageSize: DEFAULT_PAGE_SIZE,
  })
  const events = auditPage.items
  const pageBaseParams = new URLSearchParams(exportParams)
  const previousPageHref = currentPage > 1 ? `/platform/audit?${new URLSearchParams([...pageBaseParams.entries(), ["page", String(currentPage - 1)]]).toString()}` : null
  const nextPageHref = currentPage < auditPage.totalPages ? `/platform/audit?${new URLSearchParams([...pageBaseParams.entries(), ["page", String(currentPage + 1)]]).toString()}` : null

  return (
    <section className="grid gap-6 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Auditoria de plataforma</CardTitle>
            <Link
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950"
              href={`/platform/audit/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`}
            >
              Exportar CSV
            </Link>
          </div>
          <CardDescription>Historial de decisiones sobre signups, provisioning y altas de tenants desde el panel SaaS.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-[1.05fr_0.6fr_0.6fr_0.5fr_0.55fr_0.45fr_0.45fr_auto]" method="get">
            <input className="h-11 rounded-xl border border-input bg-background px-3 text-sm" defaultValue={q ?? ""} name="q" placeholder="Buscar por actor, resumen o accion" />
            <input className="h-11 rounded-xl border border-input bg-background px-3 text-sm" defaultValue={actor ?? ""} name="actor" placeholder="Actor" />
            <input className="h-11 rounded-xl border border-input bg-background px-3 text-sm" defaultValue={action ?? ""} name="action" placeholder="Accion" />
            <input className="h-11 rounded-xl border border-input bg-background px-3 text-sm" defaultValue={entityId ?? ""} name="entityId" placeholder="UUID" />
            <select className="h-11 rounded-xl border border-input bg-background px-3 text-sm" defaultValue={selectedEntityType} name="entity">
              <option value="all">Todas</option>
              <option value="platform_signup">Signup</option>
              <option value="platform_tenant">Tenant</option>
            </select>
            <select className="h-11 rounded-xl border border-input bg-background px-3 text-sm" defaultValue={selectedSurface} name="surface">
              <option value="all">Todas</option>
              <option value="platform">Platform</option>
              <option value="system">System</option>
            </select>
            <input className="h-11 rounded-xl border border-input bg-background px-3 text-sm" defaultValue={startDate ?? ""} name="startDate" type="date" />
            <input className="h-11 rounded-xl border border-input bg-background px-3 text-sm" defaultValue={endDate ?? ""} name="endDate" type="date" />
            <button className="h-11 rounded-xl bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-orange-600" type="submit">
              Filtrar
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos recientes</CardTitle>
          <CardDescription>{auditPage.total} eventos cargados. Página {auditPage.page} de {auditPage.totalPages}.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="rounded-[1rem] border border-border bg-secondary/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getSurfaceBadgeVariant(event.actorSurface)}>{formatSurfaceLabel(event.actorSurface)}</Badge>
                  <Badge variant="outline">{formatEntityLabel(event.entityType)}</Badge>
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{event.action}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-card-foreground">{event.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">{event.actorName ?? "Sistema"} · {new Date(event.createdAt).toLocaleString("es-MX")}</p>
              </div>
            ))
          ) : (
            <div className="rounded-[1rem] border border-dashed border-border p-8 text-sm text-muted-foreground">No encontramos eventos de plataforma con esos filtros.</div>
          )}

          {auditPage.total > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Mostrando {(auditPage.page - 1) * auditPage.pageSize + 1} a {Math.min(auditPage.page * auditPage.pageSize, auditPage.total)} de {auditPage.total} eventos.
              </p>
              <div className="flex items-center gap-2">
                {previousPageHref ? (
                  <Link className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href={previousPageHref}>
                    Anterior
                  </Link>
                ) : null}
                {nextPageHref ? (
                  <Link className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href={nextPageHref}>
                    Siguiente
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
