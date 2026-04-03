import { redirect } from "next/navigation"

import { CustomerLoginForm } from "@/components/auth/customer-login-form"
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
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Login</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Entrar como cliente</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
            Inicia sesión desde {tenantSlug} para ver tus pedidos, completar checkout más rápido y seguir comprando sin volver a llenar tus datos.
          </p>
        </div>

        <CustomerLoginForm tenantSlug={tenantSlug} />
      </section>
    </main>
  )
}
