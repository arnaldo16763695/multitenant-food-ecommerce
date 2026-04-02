import Link from "next/link"
import { Newsreader } from "next/font/google"
import { Clock3, MapPinned, MoveRight, Sparkles } from "lucide-react"

import { featuredBrands } from "@/lib/config/platform"

const displayFont = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
})

const cuisineFilters = ["Todo", "Burgers", "Fried chicken", "Healthy fast food", "Pickup first"] as const

export default function BrandsPage() {
  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_26%),linear-gradient(180deg,_#fbf7ef_0%,_#f7efe0_40%,_#fffdf8_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(120,53,15,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.08)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-60 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.34),_transparent_55%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <section className="grid gap-8 rounded-[2.2rem] border border-stone-950/10 bg-white/70 p-6 shadow-[0_28px_90px_rgba(120,53,15,0.10)] backdrop-blur md:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">
              <span className="rounded-full border border-orange-300/60 bg-orange-100/80 px-3 py-1.5">Marketplace</span>
              <span className="rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-stone-600">Nearest branch first</span>
            </div>

            <div className="space-y-5">
              <h1 className={`${displayFont.className} max-w-4xl text-5xl leading-[0.92] font-medium tracking-tight text-stone-950 sm:text-6xl lg:text-7xl`}>
                Pide donde <span className="italic text-orange-700">sí llega caliente</span>.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-stone-700 sm:text-lg">
                Descubre marcas cercanas, compara tiempos reales y entra directo a la sucursal con mejor promesa de
                preparación. El marketplace deja de sentirse catálogo y empieza a parecer servicio.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                href="/app/demo-brand"
              >
                Ordenar ahora
                <MoveRight className="size-4" />
              </Link>
              <button
                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/80 px-6 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-950"
                type="button"
              >
                Usar mi ubicación
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {cuisineFilters.map((filter) => (
                <button
                  key={filter}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "Todo" ? "bg-stone-950 text-white" : "border border-stone-300 bg-white/80 text-stone-700 hover:border-stone-950"}`}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.8rem] bg-stone-950 p-5 text-stone-50 shadow-[0_24px_70px_rgba(28,25,23,0.3)]">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-orange-300">Direccion activa</p>
                  <p className="mt-2 text-lg font-semibold">Av. Centro 240</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  3 marcas abiertas
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.1rem] bg-white/5 p-3">
                  <MapPinned className="mb-2 size-4 text-orange-300" />
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Cobertura</p>
                  <p className="mt-1 text-sm font-semibold">2.4 km</p>
                </div>
                <div className="rounded-[1.1rem] bg-white/5 p-3">
                  <Clock3 className="mb-2 size-4 text-orange-300" />
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Promesa</p>
                  <p className="mt-1 text-sm font-semibold">18-24 min</p>
                </div>
                <div className="rounded-[1.1rem] bg-white/5 p-3">
                  <Sparkles className="mb-2 size-4 text-orange-300" />
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Modo</p>
                  <p className="mt-1 text-sm font-semibold">Pickup + delivery</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {featuredBrands.slice(0, 2).map((brand) => (
                <article key={brand.id} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                  <div className={`mb-4 h-2 rounded-full bg-gradient-to-r ${brand.accent}`} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-400">{brand.cuisine}</p>
                      <h2 className={`${displayFont.className} mt-1 text-2xl font-medium`}>{brand.name}</h2>
                    </div>
                    <div className="rounded-full bg-black/20 px-3 py-1 text-sm font-semibold text-orange-200">{brand.etaMinutes} min</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-300">{brand.headline}</p>
                  <div className="mt-4 flex items-center justify-between text-sm text-stone-300">
                    <span>{brand.nearestBranch}</span>
                    <span className="font-semibold text-white">Sucursal sugerida</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featuredBrands.map((brand, index) => (
            <article
              key={brand.id}
              className="group relative overflow-hidden rounded-[2rem] border border-stone-950/10 bg-white/80 p-6 shadow-[0_22px_60px_rgba(120,53,15,0.08)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(120,53,15,0.14)]"
            >
              <div className="absolute top-0 right-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,_rgba(251,146,60,0.22),_transparent_70%)]" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">#{index + 1} cerca de ti</p>
                    <h2 className={`${displayFont.className} mt-3 text-3xl leading-none font-medium text-stone-950`}>{brand.name}</h2>
                  </div>
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${brand.accent} opacity-90 shadow-lg`} />
                </div>

                <p className="mt-4 text-sm leading-7 text-stone-600">{brand.headline}</p>

                <dl className="mt-6 grid gap-3 rounded-[1.4rem] border border-stone-200 bg-stone-50/90 p-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-stone-500">Sucursal sugerida</dt>
                    <dd className="font-semibold text-stone-950">{brand.nearestBranch}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-stone-500">Promesa base</dt>
                    <dd className="font-semibold text-stone-950">{brand.etaMinutes} min</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-stone-500">Canal</dt>
                    <dd className="font-semibold text-stone-950">Pickup y delivery</dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-800">{brand.cuisine}</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700">Ready now</span>
                </div>

                <Link
                  className="mt-6 inline-flex items-center justify-between rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition group-hover:border-stone-950 group-hover:bg-stone-950 group-hover:text-white"
                  href={`/app/${brand.slug}`}
                >
                  Ver marca
                  <MoveRight className="size-4" />
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
