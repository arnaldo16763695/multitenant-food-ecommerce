import { requireAdminAccess } from "@/lib/auth/admin"
import { getAdminOrders } from "@/lib/services/orders"
import { createSupabaseServerClient } from "@/lib/supabase/server"

import { AdminOrdersTable } from "@/components/admin/admin-orders-table"
import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AdminOrdersPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminOrdersPage({ params }: AdminOrdersPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const orders = await getAdminOrders(supabase, access.membership.tenantId)

  return (
    <AdminPageShell
      eyebrow="Pedidos"
      title="Seguimiento operativo por sucursal"
      description="La ruta de pedidos ya consume órdenes reales del tenant y deja lista la siguiente iteración para filtros, cambios de estado e incidencias."
      badge={`${orders.length} órdenes`}
      density="compact"
    >
      <Card>
        <CardHeader>
          <CardTitle>Órdenes recientes</CardTitle>
          <CardDescription>Vista real del flujo operativo del tenant por sucursal y canal, con cambio de estado por fila.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminOrdersTable tenantSlug={tenantSlug} orders={orders} />

          {orders.length === 0 ? (
            <div className="mt-4 rounded-[1.5rem] border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              Todavía no hay órdenes registradas para este tenant.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
