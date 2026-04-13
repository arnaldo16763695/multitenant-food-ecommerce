import Link from "next/link"
import { ArrowRight, MapPinned, Store } from "lucide-react"

type StorefrontBranchEntryProps = {
  readonly tenantSlug: string
  readonly branches: readonly {
    readonly id: string
    readonly name: string
  }[]
}

export function StorefrontBranchEntry({ tenantSlug, branches }: StorefrontBranchEntryProps) {
  return (
    <section className="grid gap-6 rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur lg:grid-cols-[0.75fr_1.25fr]">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Selecciona sucursal</p>
        <h2 className="text-3xl font-semibold tracking-tight text-stone-950">Antes de ver el menu, elige desde cual sucursal quieres comprar.</h2>
        <p className="text-sm leading-7 text-stone-600">
          Esta marca opera varias sucursales. Elegir una primero nos permite mostrar disponibilidad, precio y flujo de compra correctos desde el inicio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {branches.map((branch) => (
          <article key={branch.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50/90 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Sucursal</p>
                <h3 className="mt-2 text-xl font-semibold text-stone-950">{branch.name}</h3>
              </div>
              <div className="rounded-2xl bg-white p-3 text-orange-700 shadow-sm">
                <MapPinned className="size-5" />
              </div>
            </div>

            <div className="mt-5 grid gap-2 text-sm text-stone-600">
              <p className="inline-flex items-center gap-2">
                <Store className="size-4 text-orange-700" />
                Storefront publico por sucursal
              </p>
              <p className="truncate text-xs text-stone-500">{branch.id}</p>
            </div>

            <Link
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
              href={`/app/${tenantSlug}?branch=${branch.id}`}
            >
              Entrar a esta sucursal
              <ArrowRight className="size-4" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
