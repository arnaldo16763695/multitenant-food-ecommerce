import { requireAdminSectionAccess } from "@/lib/auth/admin-section"
import { getAdminOrders } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPaymentProofsBucket } from "@/lib/supabase/storage"

import { AdminOrdersTable } from "@/components/admin/admin-orders-table"
import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { OrderRealtimeRefresh } from "@/components/realtime/order-realtime-refresh"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AdminOrdersPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminOrdersPage({ params }: AdminOrdersPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminSectionAccess(tenantSlug, "orders")
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const orders = await getAdminOrders(supabase, access.membership.tenantId)
  const adminClient = createSupabaseAdminClient()
  const ordersWithReceiptUrls = adminClient
    ? await Promise.all(
        orders.map(async (order) => {
          if (!order.hasPaymentReceipt || !order.paymentReceiptImagePath) {
            return order
          }

          const signedUrlResult = await adminClient.storage.from(getPaymentProofsBucket()).createSignedUrl(order.paymentReceiptImagePath, 60 * 60)

          return {
            ...order,
            paymentReceiptSignedUrl: signedUrlResult.data?.signedUrl ?? null,
          }
        })
      )
    : orders

  return (
    <AdminPageShell
      eyebrow="Pedidos"
      title="Seguimiento operativo por sucursal"
      description="Las órdenes nuevas entran como pago pendiente. Desde aquí el negocio las confirma manualmente antes de pasarlas al flujo operativo y a cocina."
      badge={`${orders.length} órdenes`}
      density="compact"
    >
      <OrderRealtimeRefresh tenantId={access.membership.tenantId} />
      <Card>
        <CardHeader>
          <CardTitle>Órdenes recientes</CardTitle>
          <CardDescription>Vista real del flujo operativo del tenant por sucursal y canal, con confirmación manual del pedido y cambios de estado por fila.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminOrdersTable tenantSlug={tenantSlug} orders={ordersWithReceiptUrls} />

          {ordersWithReceiptUrls.length === 0 ? (
            <div className="mt-4 rounded-[1.5rem] border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              Todavía no hay órdenes registradas para este tenant.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
