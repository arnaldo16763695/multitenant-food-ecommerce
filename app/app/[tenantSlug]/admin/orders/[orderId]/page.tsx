import Image from "next/image"
import Link from "next/link"

import { requireAdminSectionAccess } from "@/lib/auth/admin-section"
import { formatManualPaymentMethod, formatOrderStatus, formatPaymentStatus } from "@/lib/domain/order"
import { getAdminOrderDetail } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPaymentProofsBucket } from "@/lib/supabase/storage"

import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { OrderRealtimeRefresh } from "@/components/realtime/order-realtime-refresh"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function getOrderBadgeVariant(status: string): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "ready" || status === "completed") return "success"
  if (status === "in_preparation") return "secondary"

  return "warning"
}

function getPaymentBadgeVariant(status: string): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "paid") return "success"
  if (status === "refunded") return "secondary"
  if (status === "failed") return "warning"

  return "warning"
}

function formatOrderChannel(channel: string) {
  if (channel === "web") return "Web"
  if (channel === "mobile") return "Mobile"
  if (channel === "admin") return "Admin"

  return channel
}

type AdminOrderDetailPageProps = {
  readonly params: Promise<{
    tenantSlug: string
    orderId: string
  }>
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { tenantSlug, orderId } = await params
  const access = await requireAdminSectionAccess(tenantSlug, "orders")
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const order = await getAdminOrderDetail(supabase, access.membership.tenantId, orderId)
  const adminClient = createSupabaseAdminClient()
  const paymentReceiptUrl =
    order?.paymentReceiptImageUrl && adminClient
      ? (await adminClient.storage.from(getPaymentProofsBucket()).createSignedUrl(order.paymentReceiptImageUrl, 60 * 60)).data?.signedUrl ?? null
      : null

  return (
    <AdminPageShell
      eyebrow="Pedidos / Detalle"
      title={order ? `Orden #${order.orderNumber}` : "Detalle de la orden"}
      description="Vista operativa del pedido con datos del cliente, sucursal, pago, estado e items confirmados."
      density="compact"
    >
      <OrderRealtimeRefresh tenantId={access.membership.tenantId} orderId={orderId} />
      <div className="flex justify-end">
        <Link className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href={`/app/${tenantSlug}/admin/orders`}>
          Volver a pedidos
        </Link>
      </div>

      {order ? (
        <section className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Resumen</CardTitle>
              <CardDescription>Información principal del pedido, el pago y el cliente.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1rem] bg-secondary/40 p-3.5">
                  <p className="font-semibold text-card-foreground">Cliente</p>
                  <p className="mt-1.5 text-muted-foreground">{order.customerName}</p>
                  <p className="mt-1 text-muted-foreground">{order.customerPhone ?? "Sin teléfono"}</p>
                  <p className="mt-1 text-muted-foreground">{order.customerEmail ?? "Sin email"}</p>
                </div>
                <div className="rounded-[1rem] bg-secondary/40 p-3.5">
                  <p className="font-semibold text-card-foreground">Orden</p>
                  <p className="mt-1.5 text-muted-foreground">Sucursal: {order.branchName}</p>
                  <p className="mt-1 text-muted-foreground">Canal: {formatOrderChannel(order.channel)}</p>
                  <p className="mt-1 text-muted-foreground">Método de pago: {order.paymentMethod ? formatManualPaymentMethod(order.paymentMethod) : "Manual"}</p>
                  <p className="mt-1 text-muted-foreground">Fecha: {new Date(order.placedAt).toLocaleString("es-MX")}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={getPaymentBadgeVariant(order.paymentStatus)}>{formatPaymentStatus(order.paymentStatus)}</Badge>
                <Badge variant={getOrderBadgeVariant(order.status)}>{formatOrderStatus(order.status)}</Badge>
                <Badge variant="outline">{order.fulfillmentType === "pickup" ? "Pickup" : "Delivery"}</Badge>
              </div>

              <div className="rounded-[1rem] border border-stone-200 bg-stone-50/80 p-3.5 text-sm leading-6 text-stone-600">
                En este MVP, la confirmación de la orden también valida manualmente el pago. Una vez confirmada, la orden puede avanzar al flujo de cocina.
              </div>

              {paymentReceiptUrl ? (
                <div className="rounded-[1rem] border border-border p-3.5">
                  <p className="font-semibold text-card-foreground">Comprobante de pago</p>
                  <Image
                    alt="Comprobante de pago"
                    className="mt-3 max-h-[24rem] rounded-[0.9rem] border border-border object-contain"
                    height={720}
                    src={paymentReceiptUrl}
                    unoptimized
                    width={1280}
                  />
                </div>
              ) : null}

              <div className="rounded-[1rem] border border-border p-3.5">
                <p className="font-semibold text-card-foreground">Notas</p>
                <p className="mt-2 leading-6 text-muted-foreground">{order.notes || "Sin notas del cliente."}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1rem] bg-secondary/40 p-3.5">
                  <p className="font-semibold text-card-foreground">Subtotal</p>
                  <p className="mt-1.5 text-xl font-semibold text-card-foreground">$ {order.subtotalAmount.toFixed(2)}</p>
                </div>
                <div className="rounded-[1rem] bg-secondary/40 p-3.5">
                  <p className="font-semibold text-card-foreground">Total</p>
                  <p className="mt-1.5 text-xl font-semibold text-card-foreground">$ {order.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Items del pedido</CardTitle>
              <CardDescription>Snapshot de lo que se confirmó en la orden.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-[1rem] border border-border">
                <Table>
                  <TableHeader className="bg-secondary/50">
                    <TableRow>
                      <TableHead className="h-10 px-3 text-xs">Producto</TableHead>
                      <TableHead className="h-10 px-3 text-xs">Categoría</TableHead>
                      <TableHead className="h-10 px-3 text-xs">Cantidad</TableHead>
                      <TableHead className="h-10 px-3 text-xs">Precio</TableHead>
                      <TableHead className="h-10 px-3 text-right text-xs">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="px-3 py-2 font-semibold text-card-foreground">
                          <div>
                            <p>{item.productName}</p>
                            {item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-muted-foreground">{item.categoryName ?? "Sin categoría"}</TableCell>
                        <TableCell className="px-3 py-2 text-muted-foreground">{item.quantity}</TableCell>
                        <TableCell className="px-3 py-2 text-muted-foreground">$ {item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="px-3 py-2 text-right font-medium text-card-foreground">$ {item.lineTotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">No encontramos la orden solicitada para este tenant.</CardContent>
        </Card>
      )}
    </AdminPageShell>
  )
}
