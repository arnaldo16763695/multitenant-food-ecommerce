import Link from "next/link"

import { StorefrontHeader } from "@/components/marketing/storefront-header"
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
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_26%),linear-gradient(180deg,_#fffaf2_0%,_#fff4e6_40%,_#fffdfa_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(120,53,15,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.07)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <StorefrontHeader tenantSlug={tenantSlug} brandName="Mi cuenta" branchLabel="Centro · 1.2 km" customerSession={customerContext} />

        <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Cuenta cliente</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Perfil de cliente en {tenantSlug}</h1>
            </div>
            <Link className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href={`/app/${tenantSlug}`}>
              Volver al menú
            </Link>
          </div>

          {customerContext ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
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
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-stone-300 px-6 py-8 text-sm text-stone-600">
              Aún no has iniciado sesión como cliente. <Link className="font-semibold text-stone-950" href={`/app/${tenantSlug}/account/login`}>Iniciar sesión</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
