import { requireAdminAccess } from "@/lib/auth/admin"
import { getKitchenOrders } from "@/lib/services/orders"
import { createSupabaseServerClient } from "@/lib/supabase/server"

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
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const orders = await getKitchenOrders(supabase, access.membership.tenantId)

  return (
    <AdminPageShell
      eyebrow="Kitchen"
      title="Tablero operativo de cocina"
      description="Primera fase de kitchen: órdenes reales por estado, foco en ejecución rápida y transición operativa sin complejidad extra aún."
      badge={`${orders.length} órdenes activas`}
      density="compact"
    >
      <OrderRealtimeRefresh tenantId={access.membership.tenantId} />
      <KitchenBoard tenantSlug={tenantSlug} orders={orders} />
    </AdminPageShell>
  )
}
