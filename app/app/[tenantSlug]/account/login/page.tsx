import Link from "next/link"
import { redirect } from "next/navigation"

import { CustomerLoginForm } from "@/components/auth/customer-login-form"
import { StorefrontHeader } from "@/components/marketing/storefront-header"
import { getCustomerAccountContext } from "@/lib/auth/customer"

type StorefrontLoginPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function StorefrontLoginPage({ params }: StorefrontLoginPageProps) {
  const { tenantSlug } = await params
  const customerContext = await getCustomerAccountContext()

  if (customerContext) {
    redirect(`/app/${tenantSlug}/account`)
  }

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_26%),linear-gradient(180deg,_#fffaf2_0%,_#fff4e6_40%,_#fffdfa_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(120,53,15,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.07)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <StorefrontHeader tenantSlug={tenantSlug} brandName="Login" branchLabel="Centro · 1.2 km" />

        <section className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Login</p>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Entrar como cliente</h1>
              </div>
              <Link className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href={`/app/${tenantSlug}`}>
                Volver al menú
              </Link>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              Inicia sesión desde {tenantSlug} para ver tus pedidos, completar checkout más rápido y seguir comprando sin volver a llenar tus datos.
            </p>
          </div>

          <CustomerLoginForm tenantSlug={tenantSlug} />
        </section>
      </div>
    </main>
  )
}
