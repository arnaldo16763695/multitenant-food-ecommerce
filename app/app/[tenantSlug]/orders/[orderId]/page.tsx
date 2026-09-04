import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import { OrderPaymentProofResubmission } from "@/components/marketing/order-payment-proof-resubmission"
import { StorefrontHeader } from "@/components/marketing/storefront-header"
import { OrderRealtimeRefresh } from "@/components/realtime/order-realtime-refresh"
import { formatManualPaymentMethod, formatOrderStatus } from "@/lib/domain/order"
import { formatModifierSelectionLabel } from "@/lib/storefront/modifier-display"
import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getCustomerOrderDetail, getTenantManualPaymentSettingsBySlug } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getPaymentProofsBucket } from "@/lib/supabase/storage"

type StorefrontOrderPageProps = {
  readonly params: Promise<{
    tenantSlug: string
    orderId: string
  }>
}

function getCustomerOrderStatusMessage(status: string, fulfillmentType: "pickup" | "delivery") {
  switch (status) {
    case "pending_payment":
      return "Tu pedido ya fue registrado. El negocio lo está revisando antes de confirmarlo y pasarlo a cocina."
    case "confirmed":
      return "Tu pedido ya fue confirmado por el negocio y está listo para entrar al flujo operativo."
    case "in_preparation":
      return "Tu pedido ya está en preparación en cocina."
    case "ready":
      return fulfillmentType === "pickup"
        ? "Tu pedido ya está listo para recoger en sucursal."
        : "Tu pedido ya está listo y esperando la entrega final."
    case "fulfilled":
      return fulfillmentType === "pickup"
        ? "Tu pedido ya fue retirado y marcado como finalizado."
        : "Tu pedido fue entregado y marcado como finalizado."
    case "completed":
      return fulfillmentType === "pickup"
        ? "Tu pedido ya fue retirado y marcado como finalizado."
        : "Tu pedido fue entregado y marcado como finalizado."
    case "cancelled":
      return "Tu pedido fue cancelado. Si necesitas ayuda, contacta directamente al negocio."
    default:
      return "Tu pedido sigue en proceso."
  }
}

function getCustomerPaymentStatusMessage(paymentStatus: string) {
  if (paymentStatus === "failed") {
    return "Tu comprobante fue rechazado. Revisa el motivo y vuelve a subirlo para que el negocio pueda validar tu pedido." 
  }

  return null
}

function getReceiptSubmissionBadgeClasses(status: "pending" | "rejected" | "accepted") {
  if (status === "accepted") {
    return "bg-emerald-100 text-emerald-800"
  }

  if (status === "rejected") {
    return "bg-amber-100 text-amber-800"
  }

  return "bg-stone-200 text-stone-700"
}

function formatReceiptSubmissionStatus(status: "pending" | "rejected" | "accepted") {
  if (status === "accepted") return "Aceptado"
  if (status === "rejected") return "Rechazado"

  return "Pendiente"
}

export default async function StorefrontOrderPage({ params }: StorefrontOrderPageProps) {
  const { tenantSlug, orderId } = await params
  const customerContext = await getCustomerAccountContext()
  const adminClient = createSupabaseAdminClient()

  if (!customerContext) {
    redirect(`/app/${tenantSlug}/account/login?next=${encodeURIComponent(`/app/${tenantSlug}/orders/${orderId}`)}`)
  }

  const order = adminClient
    ? await getCustomerOrderDetail(adminClient, tenantSlug, customerContext.customer.id, orderId, customerContext.customer.email)
    : null
  const paymentSettings = adminClient ? await getTenantManualPaymentSettingsBySlug(adminClient, tenantSlug) : null
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

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_26%),linear-gradient(180deg,_#fffaf2_0%,_#fff4e6_40%,_#fffdfa_100%)">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] background-image:linear-gradient(rgba(120,53,15,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.07)_1px,transparent_1px) background-size:48px_48px" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <StorefrontHeader tenantSlug={tenantSlug} brandName="Pedidos" branchId={null} branchLabel="Sucursal activa" customerSession={customerContext} />
        <OrderRealtimeRefresh orderId={orderId} />
        <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Seguimiento de pedido</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Tu orden ya quedó registrada.</h1>
        {order ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] border border-stone-200 bg-orange-50/70 p-5 text-sm leading-7 text-stone-700">
               {getCustomerOrderStatusMessage(order.status, order.fulfillmentType)}
            </div>

            {getCustomerPaymentStatusMessage(order.paymentStatus) ? (
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-5 text-sm leading-7 text-amber-900">
                {getCustomerPaymentStatusMessage(order.paymentStatus)}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-stone-50 p-5 text-sm text-stone-600">
                <p>Orden: <span className="font-semibold text-stone-950">#{order.orderNumber}</span></p>
                <p className="mt-2">Cliente: <span className="font-semibold text-stone-950">{order.customerName}</span></p>
                <p className="mt-2">Estado: <span className="font-semibold text-stone-950">{formatOrderStatus(order.status, order.fulfillmentType)}</span></p>
                <p className="mt-2">Pago: <span className="font-semibold text-stone-950">{order.paymentMethod ? formatManualPaymentMethod(order.paymentMethod) : "Manual"}</span></p>
                <p className="mt-2">Entrega: <span className="font-semibold text-stone-950">{order.fulfillmentType === "pickup" ? "Pickup" : "Delivery"}</span></p>
                <p className="mt-2">Total: <span className="font-semibold text-stone-950">$ {order.totalAmount.toFixed(2)}</span></p>
                {order.paymentRejectionReason ? <p className="mt-2">Motivo del rechazo: <span className="font-semibold text-stone-950">{order.paymentRejectionReason}</span></p> : null}
              </div>
              <div className="rounded-[1.5rem] bg-stone-50 p-5 text-sm leading-7 text-stone-600">
                Este MVP opera con <span className="font-semibold text-stone-950">validación manual del negocio</span>. Después de confirmar tu pedido, el equipo lo moverá al flujo de cocina y aquí verás el avance actualizado.
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-stone-200 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Resumen confirmado</h2>
              <div className="mt-4 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-[1.25rem] bg-stone-50 p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-stone-950">{item.productName}</p>
                        <p className="mt-1 text-stone-500">{item.quantity} x $ {item.unitPrice.toFixed(2)}</p>
                        {item.modifiers.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.modifiers.map((modifier) => (
                              <span
                                key={`${modifier.modifierGroupName}:${modifier.modifierOptionName}`}
                                className="rounded-full bg-white px-2.5 py-1 text-xs text-stone-600"
                              >
                                {formatModifierSelectionLabel(modifier)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {item.comboComponents.length > 0 ? (
                          <p className="mt-2 text-xs text-stone-500">
                            Incluye: {item.comboComponents.map((component) => `${component.quantity}x ${component.componentProductName}${component.componentVariantName ? ` (${component.componentVariantName})` : ""}`).join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <span className="font-semibold text-stone-950">$ {item.lineTotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {paymentReceiptSubmissions.length > 0 ? (
              <div className="rounded-[1.5rem] border border-stone-200 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Historial de comprobantes</h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {paymentReceiptSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className={`rounded-[1.25rem] border p-4 ${submission.isCurrent ? "border-stone-200 bg-stone-50" : "border-amber-200 bg-amber-50/50"}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-stone-950">{submission.isCurrent ? "Comprobante actual" : "Intento anterior"}</p>
                          <p className="mt-1 text-sm text-stone-500">Enviado: {new Date(submission.submittedAt).toLocaleString("es-MX")}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getReceiptSubmissionBadgeClasses(submission.reviewStatus)}`}>
                          {formatReceiptSubmissionStatus(submission.reviewStatus)}
                        </span>
                      </div>

                      {submission.rejectionReason ? (
                        <p className="mt-3 text-sm leading-6 text-amber-900">Motivo: {submission.rejectionReason}</p>
                      ) : null}

                      {submission.signedUrl ? (
                        <Image
                          alt={submission.isCurrent ? "Comprobante actual" : "Comprobante histórico"}
                          className="mt-4 max-h-[22rem] rounded-[1rem] border border-stone-200 object-contain"
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
              <div className="rounded-[1.5rem] border border-stone-200 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Comprobante enviado</h2>
                <Image
                  alt="Comprobante de pago enviado"
                  className="mt-4 max-h-[28rem] rounded-[1.25rem] border border-stone-200 object-contain"
                  height={720}
                  src={paymentReceiptUrl}
                  unoptimized
                  width={1280}
                />
              </div>
            ) : null}

            {order.paymentStatus === "failed" ? (
              <OrderPaymentProofResubmission
                tenantSlug={tenantSlug}
                orderId={orderId}
                currentPaymentMethod={order.paymentMethod}
                manualPaymentSettings={paymentSettings}
              />
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-7 text-stone-600">No encontramos esta orden dentro de tu cuenta o ya no está disponible para consulta.</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800" href={`/app/${tenantSlug}`}>
            Volver al storefront
          </Link>
          <Link className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href={`/app/${tenantSlug}/account/orders`}>
            Ver mis pedidos
          </Link>
        </div>
        </section>
      </div>
    </main>
  )
}
