import Link from "next/link"

import { getCustomerAccountContext } from "@/lib/auth/customer"

type StorefrontOrdersPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function StorefrontOrdersPage({ params }: StorefrontOrdersPageProps) {
  const { tenantSlug } = await params
  const customerContext = await getCustomerAccountContext()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Pedidos</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Historial y seguimiento de pedidos</h1>
        {customerContext ? (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
            Ya existe contexto real de cliente. El siguiente paso aquí es conectar las órdenes de {tenantSlug} desde la tabla `orders` filtradas por tu `customer_id`.
          </p>
        ) : (
          <div className="mt-4 rounded-[1.5rem] border border-dashed border-stone-300 px-6 py-8 text-sm text-stone-600">
            Para ver tus pedidos debes iniciar sesión como cliente. <Link className="font-semibold text-stone-950" href={`/app/${tenantSlug}/account/register`}>Crear cuenta</Link>
          </div>
        )}
      </section>
    </main>
  )
}
