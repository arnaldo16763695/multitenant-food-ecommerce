import { ArrowRightLeft, Clock3, CreditCard } from "lucide-react"

import type { AdminOverviewMetrics } from "@/lib/services/orders"
import { formatOrderStatus } from "@/lib/domain/order"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AdminDashboardProps = {
  readonly tenantSlug: string
  readonly metrics: AdminOverviewMetrics
}

function formatCurrency(value: number) {
  return `$ ${value.toFixed(2)}`
}

function getOrderBadgeVariant(status: string): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "ready" || status === "fulfilled" || status === "completed") return "success"
  if (status === "in_preparation") return "secondary"
  return "warning"
}

export function AdminDashboard({ tenantSlug, metrics }: AdminDashboardProps) {
  const maxBranchVolume = metrics.branchVolumes[0]?.orderCount ?? 0

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,_rgba(28,25,23,1)_0%,_rgba(41,37,36,1)_50%,_rgba(120,53,15,0.88)_100%)] text-white shadow-[0_24px_70px_rgba(28,25,23,0.24)]">
          <CardHeader className="pb-3">
            <Badge variant="warning" className="w-fit border-white/10 bg-white/10 text-orange-200">
              {tenantSlug}
            </Badge>
            <CardTitle className="mt-4 max-w-2xl text-3xl leading-tight sm:text-4xl">Centro operativo en tiempo real para el tenant.</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 text-stone-300">
              Este overview ya consume órdenes reales y prioriza lo que más bloquea la operación: pagos pendientes, rechazos y flujo hacia cocina.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3.5">
              <CreditCard className="mb-3 size-5 text-orange-300" />
              <p className="text-sm font-semibold">Pendientes de pago</p>
              <p className="mt-2 text-2xl font-semibold">{metrics.pendingPaymentCount}</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3.5">
              <ArrowRightLeft className="mb-3 size-5 text-orange-300" />
              <p className="text-sm font-semibold">Rechazos manuales</p>
              <p className="mt-2 text-2xl font-semibold">{metrics.rejectedPaymentCount}</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3.5">
              <Clock3 className="mb-3 size-5 text-orange-300" />
              <p className="text-sm font-semibold">En cocina</p>
              <p className="mt-2 text-2xl font-semibold">{metrics.inKitchenCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Lectura rápida</CardTitle>
            <CardDescription>Lo mínimo que el operador necesita ver apenas entra.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between rounded-[1rem] border border-border bg-secondary/30 px-3.5 py-3 text-sm">
              <span className="text-muted-foreground">Listos para confirmar</span>
              <span className="font-semibold text-card-foreground">{metrics.readyToConfirmCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-[1rem] border border-border bg-secondary/30 px-3.5 py-3 text-sm">
              <span className="text-muted-foreground">Finalizados hoy</span>
              <span className="font-semibold text-card-foreground">{metrics.fulfilledTodayCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-[1rem] border border-border bg-secondary/30 px-3.5 py-3 text-sm">
              <span className="text-muted-foreground">Sucursales activas</span>
              <span className="font-semibold text-card-foreground">{metrics.activeBranchCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-[1rem] border border-border bg-secondary/30 px-3.5 py-3 text-sm">
              <span className="text-muted-foreground">Ventas de hoy</span>
              <span className="font-semibold text-card-foreground">{formatCurrency(metrics.totalSalesToday)}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Volumen por sucursal</CardTitle>
            <CardDescription>Visualización compacta del volumen de órdenes de hoy por branch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.branchVolumes.length > 0 ? (
              metrics.branchVolumes.map((branch) => (
                <div key={branch.branchId} className="grid gap-2 rounded-[1rem] border border-border bg-secondary/20 p-3.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-card-foreground">{branch.branchName}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(branch.totalAmount)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-card-foreground">{branch.orderCount} órdenes</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${maxBranchVolume > 0 ? Math.max((branch.orderCount / maxBranchVolume) * 100, 8) : 0}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
                Todavía no hay órdenes suficientes para mostrar volumen por sucursal.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Órdenes recientes</CardTitle>
            <CardDescription>Últimas órdenes del tenant dentro del rango operativo reciente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.recentOrders.length > 0 ? (
              metrics.recentOrders.map((order) => (
                <div key={order.id} className="rounded-[1rem] border border-border bg-secondary/20 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">#{order.orderNumber}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{order.branchName}</p>
                    </div>
                    <Badge variant={getOrderBadgeVariant(order.status)}>{formatOrderStatus(order.status)}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>{formatCurrency(order.totalAmount)}</span>
                    <span>{new Date(order.placedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
                Todavía no hay órdenes recientes para este overview.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pagos pendientes</CardDescription>
            <CardTitle className="text-2xl">{metrics.pendingPaymentCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="warning">Revisión manual</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rechazados</CardDescription>
            <CardTitle className="text-2xl">{metrics.rejectedPaymentCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="warning">Requieren respuesta</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Por confirmar</CardDescription>
            <CardTitle className="text-2xl">{metrics.readyToConfirmCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="success">Listas para avanzar</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sucursales activas</CardDescription>
            <CardTitle className="text-2xl">{metrics.activeBranchCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Cobertura actual</Badge>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
