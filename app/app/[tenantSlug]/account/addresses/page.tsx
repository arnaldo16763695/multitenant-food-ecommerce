import Link from "next/link"

import { CustomerAddressesView } from "@/components/account/customer-addresses-view"
import { StorefrontHeader } from "@/components/marketing/storefront-header"
import { getCustomerAccountContext } from "@/lib/auth/customer"
import { getCustomerAddresses } from "@/lib/services/customer-addresses"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type StorefrontAddressesPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function StorefrontAddressesPage({ params }: StorefrontAddressesPageProps) {
  const { tenantSlug } = await params
  const customerContext = await getCustomerAccountContext()
  const adminClient = createSupabaseAdminClient()
  const addresses = customerContext && adminClient ? await getCustomerAddresses(adminClient, customerContext.customer.id) : []

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_26%),linear-gradient(180deg,_#fffaf2_0%,_#fff4e6_40%,_#fffdfa_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(120,53,15,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.07)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <StorefrontHeader tenantSlug={tenantSlug} brandName="Mis direcciones" branchId={null} branchLabel="Sucursal activa" customerSession={customerContext} />

        <section className="mx-auto w-full max-w-3xl rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Direcciones</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Libreta de direcciones</h1>
              <p className="mt-2 text-sm text-stone-600">Guarda direcciones para pedirlas más rápido cuando elijas delivery.</p>
            </div>
            <Link className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href={`/app/${tenantSlug}/account`}>
              Volver a mi cuenta
            </Link>
          </div>

          {customerContext ? (
            <CustomerAddressesView initialAddresses={addresses} />
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-stone-300 px-6 py-8 text-sm text-stone-600">
              Para administrar tus direcciones debes iniciar sesión como cliente.{" "}
              <Link className="font-semibold text-stone-950" href={`/app/${tenantSlug}/account/login`}>
                Iniciar sesión
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
