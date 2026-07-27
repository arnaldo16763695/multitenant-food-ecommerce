import Link from "next/link"
import type { ComponentProps } from "react"

import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LocalizedDateTime } from "@/components/ui/localized-date-time"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TimezoneHiddenInput } from "@/components/ui/timezone-hidden-input"
import { requireAdminSectionAccess } from "@/lib/auth/admin-section"
import { getAdminAuditEvents, type AdminAuditEvent, type AuditActorSurface } from "@/lib/services/audit"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type AdminAuditPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
  readonly searchParams: Promise<{
    q?: string
    surface?: string
    entity?: string
    startDate?: string
    endDate?: string
    timeZone?: string
    page?: string
  }>
}

const DEFAULT_PAGE_SIZE = 50

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

function formatSurfaceLabel(surface: AuditActorSurface) {
  if (surface === "admin") return "Admin"
  if (surface === "kitchen") return "Kitchen"
  if (surface === "storefront") return "Storefront"
  if (surface === "mobile_api") return "Mobile API"

  return "System"
}

function formatEntityLabel(entityType: string) {
  if (entityType === "order") return "Orden"
  if (entityType === "order_payment") return "Pago"
  if (entityType === "order_item") return "Item"
  if (entityType === "staff_member") return "Staff"
  if (entityType === "catalog_product") return "Producto"
  if (entityType === "catalog_category") return "Categoría"
  if (entityType === "catalog_modifier_group") return "Modificador"
  if (entityType === "branch") return "Sucursal"
  if (entityType === "tenant_settings") return "Configuración"
  if (entityType === "tenant_onboarding") return "Onboarding"

  return entityType
}

function getSurfaceBadgeVariant(surface: AuditActorSurface): ComponentProps<typeof Badge>["variant"] {
  if (surface === "admin") return "default"
  if (surface === "kitchen") return "secondary"
  if (surface === "storefront" || surface === "mobile_api") return "outline"

  return "warning"
}

function renderJsonBlock(event: AdminAuditEvent) {
  if (!event.beforeData && !event.afterData && !event.metadata) {
    return null
  }

  return (
    <details className="rounded-[0.9rem] border border-border bg-secondary/30 p-3">
      <summary className="cursor-pointer text-sm font-medium text-card-foreground">Ver detalle técnico</summary>
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Antes</p>
          <pre className="mt-2 overflow-x-auto rounded-[0.8rem] bg-background p-3 text-xs text-muted-foreground">
            {JSON.stringify(event.beforeData ?? {}, null, 2)}
          </pre>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Después</p>
          <pre className="mt-2 overflow-x-auto rounded-[0.8rem] bg-background p-3 text-xs text-muted-foreground">
            {JSON.stringify(event.afterData ?? {}, null, 2)}
          </pre>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Metadata</p>
          <pre className="mt-2 overflow-x-auto rounded-[0.8rem] bg-background p-3 text-xs text-muted-foreground">
            {JSON.stringify(event.metadata ?? {}, null, 2)}
          </pre>
        </div>
      </div>
    </details>
  )
}

function parsePage(value?: string) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.floor(parsedValue) : 1
}

export default async function AdminAuditPage({ params, searchParams }: AdminAuditPageProps) {
  const { tenantSlug } = await params
  const { q, surface, entity, startDate, endDate, timeZone, page } = await searchParams
  const access = await requireAdminSectionAccess(tenantSlug, "audit")
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const selectedSurface = parseSurface(surface)
  const selectedEntityType = parseEntityType(entity)
  const currentPage = parsePage(page)
  const exportParams = new URLSearchParams()

  if (q?.trim()) exportParams.set("q", q.trim())
  if (selectedSurface !== "all") exportParams.set("surface", selectedSurface)
  if (selectedEntityType !== "all") exportParams.set("entity", selectedEntityType)
  if (startDate?.trim()) exportParams.set("startDate", startDate.trim())
  if (endDate?.trim()) exportParams.set("endDate", endDate.trim())
  if (timeZone?.trim()) exportParams.set("timeZone", timeZone.trim())

  const auditPage = await getAdminAuditEvents(supabase, access.membership.tenantId, {
    query: q,
    surface: selectedSurface,
    entityType: selectedEntityType,
    startDate,
    endDate,
    timeZone,
    page: currentPage,
    pageSize: DEFAULT_PAGE_SIZE,
  })
  const events = auditPage.items

  const pageBaseParams = new URLSearchParams(exportParams)
  const previousPageHref = currentPage > 1 ? `/app/${tenantSlug}/admin/audit?${new URLSearchParams([...pageBaseParams.entries(), ["page", String(currentPage - 1)]]).toString()}` : null
  const nextPageHref = currentPage < auditPage.totalPages ? `/app/${tenantSlug}/admin/audit?${new URLSearchParams([...pageBaseParams.entries(), ["page", String(currentPage + 1)]]).toString()}` : null

  return (
    <AdminPageShell
      eyebrow="Operación / Auditoría"
      title="Auditoría operativa"
      description="Historial transversal de cambios sensibles en órdenes, pagos, kitchen y staff dentro de este tenant."
      badge={`${auditPage.total} eventos`}
      actions={
        <Link
          className="w-full rounded-full border border-stone-300 px-4 py-2 text-center text-sm font-semibold text-stone-900 transition hover:border-stone-950 sm:w-auto"
          href={`/app/${tenantSlug}/admin/audit/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`}
        >
          Exportar CSV
        </Link>
      }
    >
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Usa un solo buscador para actor, acción, resumen o UUID de entidad, y combínalo con rango de fechas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5" method="get">
            <TimezoneHiddenInput />
            <label className="grid min-w-0 gap-2 text-sm">
              <span className="font-medium text-card-foreground">Buscar</span>
              <input
                className="h-11 min-w-0 rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={q ?? ""}
                name="q"
                placeholder="Actor, acción, resumen o UUID"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-sm">
              <span className="font-medium text-card-foreground">Superficie</span>
              <select className="h-11 min-w-0 rounded-xl border border-input bg-background px-3 text-sm" defaultValue={selectedSurface} name="surface">
                <option value="all">Todas</option>
                <option value="admin">Admin</option>
                <option value="kitchen">Kitchen</option>
                <option value="storefront">Storefront</option>
                <option value="mobile_api">Mobile API</option>
                <option value="system">System</option>
              </select>
            </label>

            <label className="grid min-w-0 gap-2 text-sm">
              <span className="font-medium text-card-foreground">Entidad</span>
              <select className="h-11 min-w-0 rounded-xl border border-input bg-background px-3 text-sm" defaultValue={selectedEntityType} name="entity">
                <option value="all">Todas</option>
                <option value="order">Orden</option>
                <option value="order_payment">Pago</option>
                <option value="order_item">Item</option>
                <option value="staff_member">Staff</option>
                <option value="catalog_product">Producto</option>
                <option value="catalog_category">Categoría</option>
                <option value="catalog_modifier_group">Modificador</option>
                <option value="branch">Sucursal</option>
                <option value="tenant_settings">Configuración</option>
                <option value="tenant_onboarding">Onboarding</option>
              </select>
            </label>

            <label className="grid min-w-0 gap-2 text-sm">
              <span className="font-medium text-card-foreground">Desde</span>
              <input className="h-11 min-w-0 rounded-xl border border-input bg-background px-3 text-sm outline-none" defaultValue={startDate ?? ""} name="startDate" type="date" />
            </label>

            <label className="grid min-w-0 gap-2 text-sm">
              <span className="font-medium text-card-foreground">Hasta</span>
              <input className="h-11 min-w-0 rounded-xl border border-input bg-background px-3 text-sm outline-none" defaultValue={endDate ?? ""} name="endDate" type="date" />
            </label>

            <button className="h-11 rounded-xl bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 md:col-span-2 xl:col-span-3 2xl:col-span-5" type="submit">
              Filtrar
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Eventos recientes</CardTitle>
          <CardDescription>Solo owner y manager pueden consultar este historial. Página {auditPage.page} de {auditPage.totalPages}.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {events.length ? (
            <>
              <div className="overflow-x-auto rounded-[1rem] border border-border">
                <Table>
                  <TableHeader className="bg-secondary/50">
                    <TableRow>
                      <TableHead className="h-10 px-3 text-xs">Fecha</TableHead>
                      <TableHead className="h-10 px-3 text-xs">Actor</TableHead>
                      <TableHead className="h-10 px-3 text-xs">Superficie</TableHead>
                      <TableHead className="h-10 px-3 text-xs">Entidad</TableHead>
                      <TableHead className="h-10 px-3 text-xs">Acción</TableHead>
                      <TableHead className="h-10 px-3 text-xs">Resumen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="px-3 py-2 text-sm text-muted-foreground">
                          <LocalizedDateTime value={event.createdAt} />
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium text-card-foreground">{event.actorName ?? "Sistema"}</p>
                            <p className="text-xs text-muted-foreground">{event.actorRole ?? "Sin rol"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm">
                          <Badge variant={getSurfaceBadgeVariant(event.actorSurface)}>{formatSurfaceLabel(event.actorSurface)}</Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm text-card-foreground">{formatEntityLabel(event.entityType)}</TableCell>
                        <TableCell className="px-3 py-2 text-sm text-muted-foreground">{event.action}</TableCell>
                        <TableCell className="px-3 py-2 text-sm text-card-foreground">{event.summary}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3">
                {events.map((event) => (
                  <Card key={`${event.id}-detail`}>
                    <CardContent className="grid min-w-0 gap-3 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant={getSurfaceBadgeVariant(event.actorSurface)}>{formatSurfaceLabel(event.actorSurface)}</Badge>
                        <Badge variant="outline">{formatEntityLabel(event.entityType)}</Badge>
                        <span className="break-all text-muted-foreground">{event.action}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="break-words font-medium text-card-foreground">{event.summary}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event.actorName ?? "Sistema"} · <LocalizedDateTime value={event.createdAt} />
                        </p>
                      </div>
                      {renderJsonBlock(event)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-[1rem] border border-dashed border-border p-8 text-sm text-muted-foreground">
              No encontramos eventos con los filtros actuales.
            </div>
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
    </AdminPageShell>
  )
}
