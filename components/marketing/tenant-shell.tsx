import Link from "next/link"
import { Newsreader } from "next/font/google"
import { Clock3, Flame, MapPinned, ShoppingBag, Sparkles } from "lucide-react"

const displayFont = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
})

type TenantShellProps = {
  readonly tenantSlug: string
  readonly title: string
  readonly eyebrow: string
  readonly description: string
}

const featuredMenu = [
  {
    name: "Smash de la casa",
    detail: "Carne doble, queso fundido y salsa ahumada.",
    price: "$ 11.90",
  },
  {
    name: "Combo rush",
    detail: "Principal, papas y bebida lista para pickup.",
    price: "$ 14.50",
  },
  {
    name: "Wrap ligero",
    detail: "Pollo grillado, hojas frescas y aderezo citrico.",
    price: "$ 9.80",
  },
] as const

export function TenantShell({ tenantSlug, title, eyebrow, description }: TenantShellProps) {
  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_26%),linear-gradient(180deg,_#fffaf2_0%,_#fff4e6_40%,_#fffdfa_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(120,53,15,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.07)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <section className="grid gap-6 overflow-hidden rounded-[2.3rem] border border-stone-950/10 bg-[linear-gradient(135deg,_rgba(255,255,255,0.92)_0%,_rgba(255,247,237,0.96)_52%,_rgba(255,255,255,0.92)_100%)] p-6 shadow-[0_26px_80px_rgba(120,53,15,0.11)] md:p-8 lg:grid-cols-[1.12fr_0.88fr] lg:p-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">
              <span className="rounded-full border border-orange-300/60 bg-orange-100/80 px-3 py-1.5">{eyebrow}</span>
              <span className="rounded-full border border-stone-200 bg-white/85 px-3 py-1.5 text-stone-600">Brand slug: {tenantSlug}</span>
            </div>

            <div className="space-y-5">
              <h1 className={`${displayFont.className} max-w-4xl text-5xl leading-[0.94] font-medium tracking-tight text-stone-950 sm:text-6xl lg:text-7xl`}>
                {title} con una experiencia que <span className="italic text-orange-700">pide rápido</span> y se entiende al instante.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-stone-700 sm:text-lg">{description}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800" type="button">
                <ShoppingBag className="size-4" />
                Ver menú cercano
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white/85 px-6 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-950" type="button">
                <MapPinned className="size-4" />
                Cambiar sucursal
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.3rem] border border-stone-200 bg-white/80 p-4">
                <MapPinned className="mb-2 size-4 text-orange-700" />
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Sucursal activa</p>
                <p className="mt-1 text-sm font-semibold text-stone-950">Centro · 1.2 km</p>
              </div>
              <div className="rounded-[1.3rem] border border-stone-200 bg-white/80 p-4">
                <Clock3 className="mb-2 size-4 text-orange-700" />
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Promesa</p>
                <p className="mt-1 text-sm font-semibold text-stone-950">18 min promedio</p>
              </div>
              <div className="rounded-[1.3rem] border border-stone-200 bg-white/80 p-4">
                <Flame className="mb-2 size-4 text-orange-700" />
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Modo cocina</p>
                <p className="mt-1 text-sm font-semibold text-stone-950">Alta rotación</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.8rem] bg-stone-950 p-5 text-stone-50 shadow-[0_24px_70px_rgba(28,25,23,0.26)]">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-orange-300">Selección cercana</p>
                  <p className={`${displayFont.className} mt-2 text-3xl font-medium`}>Listo para abrir pedido</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-300">Abierto ahora</div>
              </div>
              <div className="mt-4 grid gap-3">
                {featuredMenu.map((item) => (
                  <div key={item.name} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{item.name}</p>
                        <p className="mt-1 text-sm leading-6 text-stone-300">{item.detail}</p>
                      </div>
                      <span className="rounded-full bg-orange-400/15 px-3 py-1 text-sm font-semibold text-orange-200">{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <Link className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10" href="/brands">
                Marketplace
              </Link>
              <Link className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10" href={`/app/${tenantSlug}/admin`}>
                Admin
              </Link>
              <Link className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10" href={`/app/${tenantSlug}/kitchen`}>
                Kitchen
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-[2rem] border border-stone-950/10 bg-white/80 p-6 shadow-[0_18px_60px_rgba(120,53,15,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Direccion visual</p>
            <h2 className={`${displayFont.className} mt-4 text-4xl font-medium text-stone-950`}>Storefront pensado para conversión, no solo para mostrar estructura.</h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">
              Esta base ya marca mejor el lenguaje que debería tener el storefront: sucursal elegida, menú protagonista,
              CTA claros y una atmósfera de marca más comercial.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-[1.6rem] border border-stone-950/10 bg-white/80 p-5 shadow-[0_18px_50px_rgba(120,53,15,0.08)]">
              <Sparkles className="mb-4 size-5 text-orange-700" />
              <p className="text-sm font-semibold text-stone-950">Hero útil</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">Menos placeholder técnico, más intención de compra y branch context.</p>
            </article>
            <article className="rounded-[1.6rem] border border-stone-950/10 bg-white/80 p-5 shadow-[0_18px_50px_rgba(120,53,15,0.08)]">
              <ShoppingBag className="mb-4 size-5 text-orange-700" />
              <p className="text-sm font-semibold text-stone-950">Menú cercano</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">Productos visibles según branch, no un menú abstracto desconectado.</p>
            </article>
            <article className="rounded-[1.6rem] border border-stone-950/10 bg-white/80 p-5 shadow-[0_18px_50px_rgba(120,53,15,0.08)]">
              <Clock3 className="mb-4 size-5 text-orange-700" />
              <p className="text-sm font-semibold text-stone-950">Promesa clara</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">Tiempo, pickup y disponibilidad deben vivir arriba, no escondidos más tarde.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
