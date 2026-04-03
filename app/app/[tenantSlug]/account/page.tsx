type StorefrontAccountPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function StorefrontAccountPage({ params }: StorefrontAccountPageProps) {
  const { tenantSlug } = await params

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Cuenta cliente</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Perfil de cliente en {tenantSlug}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
          Aquí podremos mostrar datos del cliente, direcciones guardadas, favoritos y preferencias del storefront.
        </p>
      </section>
    </main>
  )
}
