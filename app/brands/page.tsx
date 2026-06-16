import Link from "next/link"
import { DM_Serif_Display, Manrope } from "next/font/google"
import { ArrowRight, Clock3, MapPinned, Search, SlidersHorizontal, Sparkles, Store } from "lucide-react"

import { TenantBrandMark } from "@/components/branding/tenant-brand-mark"
import { getPublicBrandsDirectory } from "@/lib/data/public-brands"

const displayFont = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
})

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const cuisineFilters = ["Todo", "Burgers", "Fried chicken", "Healthy fast food"] as const

type BrandsPageProps = {
  readonly searchParams: Promise<{
    q?: string
    cuisine?: string
  }>
}

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? ""
}

export default async function BrandsPage({ searchParams }: BrandsPageProps) {
  const { q, cuisine } = await searchParams
  const brands = await getPublicBrandsDirectory()
  const query = normalizeValue(q)
  const selectedCuisine = cuisineFilters.includes((cuisine ?? "Todo") as (typeof cuisineFilters)[number])
    ? ((cuisine ?? "Todo") as (typeof cuisineFilters)[number])
    : "Todo"

  const filteredBrands = brands.filter((brand) => {
    const matchesCuisine = selectedCuisine === "Todo" ? true : brand.cuisine === selectedCuisine
    const matchesQuery =
      !query ||
      [brand.name, brand.cuisine, brand.headline, brand.nearestBranch].some((value) => value.toLowerCase().includes(query))

    return matchesCuisine && matchesQuery
  })

  return (
    <main className={`${bodyFont.className} relative isolate flex flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,_#f6efe4_0%,_#f4eadc_30%,_#faf7f2_70%,_#fcfbf8_100%)] text-stone-950`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.22),_transparent_26%),linear-gradient(rgba(120,53,15,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.05)_1px,transparent_1px)] [background-size:auto,42px_42px,42px_42px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <section className="grid gap-8 rounded-[2.4rem] border border-stone-950/10 bg-white/75 p-6 shadow-[0_28px_90px_rgba(120,53,15,0.10)] backdrop-blur md:p-8 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">
              <span className="rounded-full border border-orange-300/60 bg-orange-100/80 px-3 py-1.5">Marketplace publico</span>
              <span className="rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-stone-600">Entrada por marca</span>
            </div>

            <div className="space-y-5">
              <h1 className={`${displayFont.className} max-w-4xl text-5xl leading-[0.92] font-normal tracking-tight text-stone-950 sm:text-6xl lg:text-7xl`}>
                Elige tienda, abre su storefront y entra a comprar sin perder contexto.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-stone-700 sm:text-lg">
                Este directorio publico ya no solo exhibe marcas. Te lleva al storefront correcto para que luego el cliente aterrice en la sucursal que realmente operara su pedido.
              </p>
            </div>

            <form className="grid gap-3 rounded-[1.6rem] border border-stone-200 bg-stone-50/85 p-4 md:grid-cols-[1fr_auto] md:items-end" method="get">
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-stone-700">Buscar tienda, cocina o zona</span>
                <div className="flex h-12 items-center gap-3 rounded-full border border-stone-300 bg-white px-4">
                  <Search className="size-4 text-stone-500" />
                  <input
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Ej. burgers, centro, pollo..."
                    className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
                  />
                </div>
              </label>

              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-orange-600" type="submit">
                <SlidersHorizontal className="size-4" />
                Filtrar
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {cuisineFilters.map((filter) => {
                const params = new URLSearchParams()

                if (q?.trim()) {
                  params.set("q", q.trim())
                }

                if (filter !== "Todo") {
                  params.set("cuisine", filter)
                }

                const href = params.toString() ? `/brands?${params.toString()}` : "/brands"
                const isActive = filter === selectedCuisine

                return (
                  <Link
                    key={filter}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-orange-600 text-white"
                        : "border border-stone-950 bg-stone-950 text-white hover:bg-orange-600 hover:border-orange-600"
                    }`}
                    href={href}
                  >
                    {filter}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.9rem] bg-stone-950 p-5 text-stone-50 shadow-[0_24px_70px_rgba(28,25,23,0.3)]">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-orange-300">Resultado actual</p>
                  <p className="mt-2 text-lg font-semibold">{filteredBrands.length} tiendas visibles</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Directorio activo
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.1rem] bg-white/5 p-3">
                  <Store className="mb-2 size-4 text-orange-300" />
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Entrada</p>
                  <p className="mt-1 text-sm font-semibold">Por marca</p>
                </div>
                <div className="rounded-[1.1rem] bg-white/5 p-3">
                  <Clock3 className="mb-2 size-4 text-orange-300" />
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Promesa base</p>
                  <p className="mt-1 text-sm font-semibold">18-24 min</p>
                </div>
                <div className="rounded-[1.1rem] bg-white/5 p-3">
                  <Sparkles className="mb-2 size-4 text-orange-300" />
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Siguiente paso</p>
                  <p className="mt-1 text-sm font-semibold">Storefront</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {filteredBrands.slice(0, 2).map((brand) => (
                <article key={brand.id} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                  <div className={`mb-4 h-2 rounded-full bg-gradient-to-r ${brand.accent}`} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <TenantBrandMark name={brand.name} logoImageUrl={brand.logoImageUrl} size="md" className="border-white/10 bg-white" />
                      <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-400">{brand.cuisine}</p>
                      <h2 className={`${displayFont.className} mt-1 text-2xl font-normal`}>{brand.name}</h2>
                      </div>
                    </div>
                    <div className="rounded-full bg-black/20 px-3 py-1 text-sm font-semibold text-orange-200">{brand.etaMinutes} min</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-300">{brand.headline}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm text-stone-300">
                    <span>{brand.nearestBranch}</span>
                    <span className="font-semibold text-white">Sucursal sugerida</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Tiendas</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">Marcas listas para abrir su storefront.</h2>
          </div>
          <p className="text-sm text-stone-600">
            {query ? `Busqueda: "${q}"` : "Sin busqueda"} {selectedCuisine !== "Todo" ? `• Filtro: ${selectedCuisine}` : ""}
          </p>
        </section>

        {filteredBrands.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-stone-300 bg-white/75 px-6 py-14 text-center shadow-[0_22px_70px_rgba(120,53,15,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Sin coincidencias</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">No encontramos tiendas con ese criterio.</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Prueba quitando filtros o buscando por cocina, nombre de marca o zona.
            </p>
            <div className="mt-6">
              <Link className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600" href="/brands">
                Limpiar filtros
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredBrands.map((brand, index) => (
              <article
                key={brand.id}
                className="group relative overflow-hidden rounded-[2rem] border border-stone-950/10 bg-white/80 p-6 shadow-[0_22px_60px_rgba(120,53,15,0.08)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(120,53,15,0.14)]"
              >
                <div className={`absolute inset-x-6 top-0 h-2 rounded-b-full bg-gradient-to-r ${brand.accent}`} />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <TenantBrandMark name={brand.name} logoImageUrl={brand.logoImageUrl} size="lg" />
                      <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">#{index + 1} en el directorio</p>
                      <h3 className={`${displayFont.className} mt-3 text-4xl leading-none font-normal text-stone-950`}>{brand.name}</h3>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">ETA</p>
                      <p className="mt-1 text-lg font-semibold text-stone-950">{brand.etaMinutes} min</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-stone-600">{brand.headline}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-800">{brand.cuisine}</span>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700">Pickup y delivery</span>
                  </div>

                  <dl className="mt-6 grid gap-3 rounded-[1.4rem] border border-stone-200 bg-stone-50/90 p-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="inline-flex items-center gap-2 text-stone-500">
                        <MapPinned className="size-4 text-orange-700" />
                        Sucursal sugerida
                      </dt>
                      <dd className="font-semibold text-stone-950">{brand.nearestBranch}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="inline-flex items-center gap-2 text-stone-500">
                        <Clock3 className="size-4 text-orange-700" />
                        Entrada publica
                      </dt>
                      <dd className="font-semibold text-stone-950">Storefront por marca</dd>
                    </div>
                  </dl>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <Link
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                      href={brand.storefrontHref}
                    >
                      Ver tienda
                      <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950"
                      href="/"
                    >
                      Volver al inicio
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
