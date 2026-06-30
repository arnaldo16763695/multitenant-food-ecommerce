import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import { OrderRealtimeRefresh } from "@/components/realtime/order-realtime-refresh"
import { formatManualPaymentMethod, formatOrderStatus } from "@/lib/domain/order"
import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getCustomerOrderDetail } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getPaymentProofsBucket } from "@/lib/supabase/storage"

type StorefrontOrderPageProps = {
  readonly params: Promise<{
    tenantSlug: string
    orderId: string
  }>
}

function getCustomerOrderStatusMessage(status: string) {
  switch (status) {
    case "pending_payment":
      return "Tu pedido ya fue registrado. El negocio lo está revisando antes de confirmarlo y pasarlo a cocina."
    case "confirmed":
      return "Tu pedido ya fue confirmado por el negocio y está listo para entrar al flujo operativo."
    case "in_preparation":
      return "Tu pedido ya está en preparación en cocina."
    case "ready":
      return "Tu pedido ya está listo para recoger en sucursal."
    case "completed":
      return "Tu pedido fue entregado y marcado como completado."
    case "cancelled":
      return "Tu pedido fue cancelado. Si necesitas ayuda, contacta directamente al negocio."
    default:
      return "Tu pedido sigue en proceso."
  }
}

export default async function StorefrontOrderPage({ params }: StorefrontOrderPageProps) {
  const { tenantSlug, orderId } = await params
  const customerContext = await getCustomerAccountContext()
  const adminClient = createSupabaseAdminClient()

  if (!customerContext) {
    redirect(`/app/${tenantSlug}/account/login?next=${encodeURIComponent(`/app/${tenantSlug}/orders/${orderId}`)}`)
  }

  const order = adminClient
    ? await getCustomerOrderDetail(adminClient, tenantSlug, customerContext.customer.id, orderId)
    : null
  const paymentReceiptUrl =
    order?.paymentReceiptImageUrl && adminClient
      ? (await adminClient.storage.from(getPaymentProofsBucket()).createSignedUrl(order.paymentReceiptImageUrl, 60 * 60)).data?.signedUrl ?? null
      : null

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <OrderRealtimeRefresh orderId={orderId} />
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Seguimiento de pedido</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Tu orden ya quedó registrada.</h1>
        {order ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] border border-stone-200 bg-orange-50/70 p-5 text-sm leading-7 text-stone-700">
              {getCustomerOrderStatusMessage(order.status)}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-stone-50 p-5 text-sm text-stone-600">
                <p>Orden: <span className="font-semibold text-stone-950">#{order.orderNumber}</span></p>
                <p className="mt-2">Cliente: <span className="font-semibold text-stone-950">{order.customerName}</span></p>
                <p className="mt-2">Estado: <span className="font-semibold text-stone-950">{formatOrderStatus(order.status)}</span></p>
                <p className="mt-2">Pago: <span className="font-semibold text-stone-950">{order.paymentMethod ? formatManualPaymentMethod(order.paymentMethod) : "Manual"}</span></p>
                <p className="mt-2">Entrega: <span className="font-semibold text-stone-950">{order.fulfillmentType === "pickup" ? "Pickup" : "Delivery"}</span></p>
                <p className="mt-2">Total: <span className="font-semibold text-stone-950">$ {order.totalAmount.toFixed(2)}</span></p>
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
                      </div>
                      <span className="font-semibold text-stone-950">$ {item.lineTotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {paymentReceiptUrl ? (
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
    </main>
  )
}
