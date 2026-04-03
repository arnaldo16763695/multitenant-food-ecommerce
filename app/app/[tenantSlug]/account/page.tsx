import Link from "next/link"

import { getCustomerAccountContext } from "@/lib/auth/customer"

type StorefrontAccountPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function StorefrontAccountPage({ params }: StorefrontAccountPageProps) {
  const { tenantSlug } = await params
  const customerContext = await getCustomerAccountContext()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Cuenta cliente</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Perfil de cliente en {tenantSlug}</h1>
        {customerContext ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-950">Datos de la cuenta</p>
              <div className="mt-3 space-y-2 text-sm text-stone-600">
                <p>Nombre: {customerContext.customer.fullName ?? customerContext.user.email}</p>
                <p>Email: {customerContext.customer.email ?? customerContext.user.email}</p>
                <p>Teléfono: {customerContext.customer.phone ?? "Sin teléfono"}</p>
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-950">Preferencias</p>
              <div className="mt-3 space-y-2 text-sm text-stone-600">
                <p>Marketing: {customerContext.customer.marketingOptIn ? "Aceptado" : "No suscrito"}</p>
                <p>Cuenta global: activa</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[1.5rem] border border-dashed border-stone-300 px-6 py-8 text-sm text-stone-600">
            Aún no has iniciado sesión como cliente. <Link className="font-semibold text-stone-950" href={`/app/${tenantSlug}/account/register`}>Crear cuenta</Link>
          </div>
        )}
      </section>
    </main>
  )
}
