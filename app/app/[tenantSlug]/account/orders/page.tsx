import Link from "next/link"

import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getCustomerOrders } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type StorefrontOrdersPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function StorefrontOrdersPage({ params }: StorefrontOrdersPageProps) {
  const { tenantSlug } = await params
  const customerContext = await getCustomerAccountContext()
  const adminClient = createSupabaseAdminClient()
  const customerOrders = customerContext && adminClient ? await getCustomerOrders(adminClient, tenantSlug, customerContext.customer.id) : []

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Pedidos</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Historial y seguimiento de pedidos</h1>
        {customerContext ? (
          <div className="mt-5 space-y-4">
            {customerOrders.length > 0 ? (
              customerOrders.map((order) => (
                <article key={order.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-stone-950">Orden #{order.orderNumber}</p>
                      <p className="mt-1 text-sm text-stone-600">{new Date(order.placedAt).toLocaleString("es-MX")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-stone-700">{order.fulfillmentType === "pickup" ? "Pickup" : "Delivery"}</span>
                      <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700">{order.status}</span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-stone-600 md:grid-cols-3">
                    <p>Items: <span className="font-semibold text-stone-950">{order.itemCount}</span></p>
                    <p>Total: <span className="font-semibold text-stone-950">$ {order.totalAmount.toFixed(2)}</span></p>
                    <p>
                      <Link className="font-semibold text-stone-950" href={`/app/${tenantSlug}/orders/${order.id}`}>
                        Ver detalle
                      </Link>
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-stone-300 px-6 py-10 text-sm text-stone-600">
                Aún no tienes pedidos registrados en {tenantSlug}. <Link className="font-semibold text-stone-950" href={`/app/${tenantSlug}`}>Explorar menú</Link>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-[1.5rem] border border-dashed border-stone-300 px-6 py-8 text-sm text-stone-600">
            Para ver tus pedidos debes iniciar sesión como cliente. <Link className="font-semibold text-stone-950" href={`/app/${tenantSlug}/account/register`}>Crear cuenta</Link>
          </div>
        )}
      </section>
    </main>
  )
}
