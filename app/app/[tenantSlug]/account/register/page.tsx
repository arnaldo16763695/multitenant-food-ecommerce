import { CustomerRegisterForm } from "@/components/auth/customer-register-form"

type StorefrontRegisterPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function StorefrontRegisterPage({ params }: StorefrontRegisterPageProps) {
  const { tenantSlug } = await params

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Registro</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Crear cuenta de cliente</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
            Regístrate desde {tenantSlug} para guardar direcciones, ver tus pedidos y volver a comprar más rápido en esta y otras marcas.
          </p>
        </div>

        <CustomerRegisterForm tenantSlug={tenantSlug} />
      </section>
    </main>
  )
}
