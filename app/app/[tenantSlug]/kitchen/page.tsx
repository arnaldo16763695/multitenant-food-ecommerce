import { requireKitchenAccess } from "@/lib/auth/admin"
import { getKitchenDiagnostics, getKitchenOrders } from "@/lib/services/orders"
import { getActiveBranchIdsForMembership } from "@/lib/services/staff"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KitchenBoard } from "@/components/kitchen/kitchen-board"
import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { OrderRealtimeRefresh } from "@/components/realtime/order-realtime-refresh"

type KitchenPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function KitchenPage({ params }: KitchenPageProps) {
  const { tenantSlug } = await params
  const access = await requireKitchenAccess(tenantSlug)
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const branchIds = await getActiveBranchIdsForMembership(supabase, access.membership.id)
  const [orders, diagnostics] = await Promise.all([
    getKitchenOrders(supabase, access.membership.tenantId, branchIds),
    getKitchenDiagnostics(supabase, access.membership.tenantId, branchIds),
  ])

  return (
    <AdminPageShell
      eyebrow="Kitchen"
      title="Tablero operativo de cocina"
      description="Primera fase de kitchen: órdenes reales por estado, foco en ejecución rápida y transición operativa sin complejidad extra aún."
      badge={`${orders.length} órdenes activas`}
      density="compact"
    >
      <OrderRealtimeRefresh tenantId={access.membership.tenantId} />
      <Card>
        <CardHeader>
          <CardTitle>Diagnostico de kitchen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Membership actual: {access.membership.id}</p>
          <p>Rol actual: {access.membership.role}</p>
          <p>Branches activas detectadas: {branchIds.length ? branchIds.join(", ") : "ninguna"}</p>
          <p>Ordenes activas en esas branches: {diagnostics.activeOrdersInBranches}</p>
          <p>Ordenes confirmadas en esas branches: {diagnostics.confirmedOrdersInBranches}</p>
          <div className="rounded-xl border border-border bg-secondary/30 px-3 py-3">
            {diagnostics.ordersByBranch.length ? (
              diagnostics.ordersByBranch.slice(0, 8).map((order, index) => (
                <p key={`${order.branchId}-${order.status}-${index}`}>
                  {order.branchName} | {order.branchId} | {order.status}
                </p>
              ))
            ) : (
              <p>No hay ordenes activas en las branches filtradas.</p>
            )}
          </div>
        </CardContent>
      </Card>
      <KitchenBoard
        tenantSlug={tenantSlug}
        orders={orders}
        currentMembershipId={access.membership.id}
      />
    </AdminPageShell>
  )
}
