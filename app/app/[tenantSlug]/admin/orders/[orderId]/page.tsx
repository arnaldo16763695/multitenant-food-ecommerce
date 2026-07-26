import Image from "next/image"
import Link from "next/link"

import { requireAdminSectionAccess } from "@/lib/auth/admin-section"
import { AdminOrderPaymentReview } from "@/components/admin/admin-order-payment-review"
import { getAdminAuditEvents } from "@/lib/services/audit"
import { formatManualPaymentMethod, formatOrderStatus, formatPaymentStatus } from "@/lib/domain/order"
import { getAdminOrderDetail } from "@/lib/services/orders"
import { formatModifierSelectionLabel } from "@/lib/storefront/modifier-display"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPaymentProofsBucket } from "@/lib/supabase/storage"

import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { OrderRealtimeRefresh } from "@/components/realtime/order-realtime-refresh"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LocalizedDateTime } from "@/components/ui/localized-date-time"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function getOrderBadgeVariant(status: string): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "ready" || status === "fulfilled" || status === "completed") return "success"
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

function getOrderAssignmentLabel(order: {
  assignedStaffName: string | null
  status: string
}) {
  if (order.assignedStaffName) {
    return `Tomada por ${order.assignedStaffName}`
  }

  if (order.status === "in_preparation" || order.status === "ready") {
    return "Movida desde admin, pendiente de tomar"
  }

  return "Sin asignar"
}

function getReceiptSubmissionBadgeVariant(status: "pending" | "rejected" | "accepted"): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "accepted") return "success"
  if (status === "rejected") return "warning"

  return "secondary"
}

function formatReceiptSubmissionStatus(status: "pending" | "rejected" | "accepted") {
  if (status === "accepted") return "Aceptado"
  if (status === "rejected") return "Rechazado"

  return "Pendiente"
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
  const paymentReceiptSubmissions =
    order && adminClient
      ? await Promise.all(
          order.paymentReceiptSubmissions.map(async (submission, index) => {
            const signedUrlResult = await adminClient.storage
              .from(getPaymentProofsBucket())
              .createSignedUrl(submission.receiptImagePath, 60 * 60)

            return {
              ...submission,
              signedUrl: signedUrlResult.data?.signedUrl ?? null,
              isCurrent: index === 0,
            }
          })
        )
      : []
  const orderAuditEvents = order
    ? await getAdminAuditEvents(supabase, access.membership.tenantId, {
        entityType: "order",
        entityId: orderId,
        limit: 25,
      })
    : null

  const paymentAuditEvents = order
    ? await getAdminAuditEvents(supabase, access.membership.tenantId, {
        entityType: "order_payment",
        entityId: orderId,
        limit: 25,
      })
    : null

  const auditEvents = [...(orderAuditEvents?.items ?? []), ...(paymentAuditEvents?.items ?? [])].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )

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
                  <p className="mt-1 text-muted-foreground">Asignación: {getOrderAssignmentLabel(order)}</p>
                  <p className="mt-1 text-muted-foreground">Método de pago: {order.paymentMethod ? formatManualPaymentMethod(order.paymentMethod) : "Manual"}</p>
                  <p className="mt-1 text-muted-foreground">Fecha: {new Date(order.placedAt).toLocaleString("es-MX")}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={getPaymentBadgeVariant(order.paymentStatus)}>{formatPaymentStatus(order.paymentStatus)}</Badge>
                <Badge variant={getOrderBadgeVariant(order.status)}>{formatOrderStatus(order.status, order.fulfillmentType)}</Badge>
                <Badge variant="outline">{order.fulfillmentType === "pickup" ? "Pickup" : "Delivery"}</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50/70 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Total esperado</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-950">$ {order.totalAmount.toFixed(2)}</p>
                  <p className="mt-1 text-sm text-emerald-800">Usa este monto como referencia principal para validar el comprobante.</p>
                </div>
                <div className="rounded-[1rem] border border-border bg-secondary/40 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Lectura rápida</p>
                  <p className="mt-2 text-sm text-card-foreground">Método: {order.paymentMethod ? formatManualPaymentMethod(order.paymentMethod) : "Manual"}</p>
                  <p className="mt-1 text-sm text-card-foreground">Estado del pago: {formatPaymentStatus(order.paymentStatus)}</p>
                  <p className="mt-1 text-sm text-card-foreground">Canal del pedido: {formatOrderChannel(order.channel)}</p>
                </div>
              </div>

              <div className="rounded-[1rem] border border-stone-200 bg-stone-50/80 p-3.5 text-sm leading-6 text-stone-600">
                En este MVP, la confirmación de la orden también valida manualmente el pago. Una vez confirmada, la orden puede avanzar al flujo de cocina.
              </div>

              <div className="rounded-[1rem] border border-border p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-card-foreground">Auditoría de esta orden</p>
                    <p className="mt-1 text-sm text-muted-foreground">Historial operativo de estado, asignación y revisión de pago.</p>
                  </div>
                  <Link
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-900 transition hover:border-stone-950"
                    href={`/app/${tenantSlug}/admin/audit?entityId=${encodeURIComponent(orderId)}`}
                  >
                    Ver auditoría completa
                  </Link>
                </div>

                {auditEvents.length ? (
                  <div className="mt-4 grid gap-3">
                    {auditEvents.slice(0, 8).map((event) => (
                      <div key={event.id} className="rounded-[0.95rem] border border-border bg-secondary/20 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{event.entityType === "order_payment" ? "Pago" : "Orden"}</Badge>
                          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{event.action}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-card-foreground">{event.summary}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {event.actorName ?? "Sistema"} · <LocalizedDateTime value={event.createdAt} />
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Todavía no hay eventos auditados para esta orden.</p>
                )}
              </div>

              {order.paymentRejectionReason ? (
                <div className="rounded-[1rem] border border-amber-200 bg-amber-50/70 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Último rechazo</p>
                  <p className="mt-2 text-sm leading-6 text-amber-950">{order.paymentRejectionReason}</p>
                </div>
              ) : null}

              <AdminOrderPaymentReview
                tenantSlug={tenantSlug}
                orderId={orderId}
                paymentStatus={order.paymentStatus}
                existingReason={order.paymentRejectionReason}
              />

              {paymentReceiptSubmissions.length > 0 ? (
                <div className="grid gap-3">
                  <div>
                    <p className="font-semibold text-card-foreground">Historial de comprobantes</p>
                    <p className="mt-1 text-sm text-muted-foreground">Cada reenvío queda guardado con su resultado de revisión para comparar la evolución del pago.</p>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {paymentReceiptSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className={`rounded-[1rem] border p-3.5 ${submission.isCurrent ? "border-border bg-white" : "border-amber-200 bg-amber-50/40"}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {submission.isCurrent ? "Comprobante actual" : "Intento anterior"}
                            </p>
                            <p className="mt-1 text-sm text-card-foreground">{formatManualPaymentMethod(submission.paymentMethod)}</p>
                          </div>
                          <Badge variant={getReceiptSubmissionBadgeVariant(submission.reviewStatus)}>
                            {formatReceiptSubmissionStatus(submission.reviewStatus)}
                          </Badge>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          <p>Enviado: {new Date(submission.submittedAt).toLocaleString("es-MX")}</p>
                          {submission.reviewedAt ? <p>Revisado: {new Date(submission.reviewedAt).toLocaleString("es-MX")}</p> : null}
                          {submission.reviewedByName ? <p>Revisó: {submission.reviewedByName}</p> : null}
                          {submission.rejectionReason ? <p className="text-amber-900">Motivo: {submission.rejectionReason}</p> : null}
                        </div>

                        {submission.signedUrl ? (
                          <Image
                            alt={submission.isCurrent ? "Comprobante de pago actual" : "Comprobante de pago histórico"}
                            className="mt-3 max-h-[24rem] rounded-[0.9rem] border border-border object-contain"
                            height={720}
                            src={submission.signedUrl}
                            unoptimized
                            width={1280}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : paymentReceiptUrl ? (
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
                            {item.modifiers.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {item.modifiers.map((modifier) => (
                                  <span
                                    key={`${modifier.modifierGroupName}:${modifier.modifierOptionName}`}
                                    className="rounded-full bg-secondary/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                                  >
                                    {formatModifierSelectionLabel(modifier)}
                                  </span>
                                ))}
                              </div>
                            ) : null}
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
