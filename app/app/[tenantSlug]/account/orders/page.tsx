import Link from "next/link"

import { StorefrontHeader } from "@/components/marketing/storefront-header"
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
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_26%),linear-gradient(180deg,_#fffaf2_0%,_#fff4e6_40%,_#fffdfa_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(120,53,15,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.07)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <StorefrontHeader tenantSlug={tenantSlug} brandName="Pedidos" branchLabel="Centro · 1.2 km" customerSession={customerContext} />

        <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Pedidos</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Historial y seguimiento de pedidos</h1>
            </div>
            <Link className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href={`/app/${tenantSlug}`}>
              Volver al menú
            </Link>
          </div>

          {customerContext ? (
            <div className="mt-6 space-y-4">
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
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-stone-300 px-6 py-8 text-sm text-stone-600">
              Para ver tus pedidos debes iniciar sesión como cliente. <Link className="font-semibold text-stone-950" href={`/app/${tenantSlug}/account/login`}>Iniciar sesión</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
