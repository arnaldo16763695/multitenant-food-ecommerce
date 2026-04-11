import Link from "next/link"

import { OrderRealtimeRefresh } from "@/components/realtime/order-realtime-refresh"
import { formatOrderStatus } from "@/lib/domain/order"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type StorefrontOrderPageProps = {
  readonly params: Promise<{
    tenantSlug: string
    orderId: string
  }>
}

type OrderRow = {
  id: string
  order_number: number
  status: string
  customer_name: string
  total_amount: number
}

export default async function StorefrontOrderPage({ params }: StorefrontOrderPageProps) {
  const { tenantSlug, orderId } = await params
  const adminClient = createSupabaseAdminClient()

  const orderResult = adminClient
    ? await adminClient
        .from("orders")
        .select("id, order_number, status, customer_name, total_amount")
        .eq("id", orderId)
        .limit(1)
        .maybeSingle<OrderRow>()
    : { data: null, error: null }

  const order = orderResult.data

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <OrderRealtimeRefresh orderId={orderId} />
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Pedido recibido</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Tu orden ya quedó registrada.</h1>
        {order ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-stone-50 p-5 text-sm text-stone-600">
              <p>Orden: <span className="font-semibold text-stone-950">#{order.order_number}</span></p>
              <p className="mt-2">Cliente: <span className="font-semibold text-stone-950">{order.customer_name}</span></p>
              <p className="mt-2">Estado: <span className="font-semibold text-stone-950">{formatOrderStatus(order.status)}</span></p>
              <p className="mt-2">Total: <span className="font-semibold text-stone-950">$ {order.total_amount.toFixed(2)}</span></p>
            </div>
            <div className="rounded-[1.5rem] bg-stone-50 p-5 text-sm leading-7 text-stone-600">
              Tu pedido queda pendiente de validación en admin. Cuando el pago sea confirmado, la orden pasará al flujo operativo de kitchen.
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-7 text-stone-600">No pudimos recuperar el detalle completo de la orden, pero el pedido quedó registrado para revisión.</p>
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
