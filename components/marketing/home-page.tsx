import Link from "next/link"
import { DM_Serif_Display, Manrope } from "next/font/google"
import { ArrowRight, Building2, ExternalLink, MapPinned, ShieldCheck, Store, TimerReset, Users } from "lucide-react"

import { TenantBrandMark } from "@/components/branding/tenant-brand-mark"
import { featuredBrands, platformName } from "@/lib/config/platform"

const displayFont = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
})

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const publicFlow = [
  {
    title: "Descubre la tienda",
    description: "El cliente entra por marketplace, enlace compartido o QR de la sucursal.",
  },
  {
    title: "Aterriza en la sucursal correcta",
    description: "El storefront ya respeta la branch activa para mostrar precio y disponibilidad reales.",
  },
  {
    title: "Compra con contexto operativo",
    description: "La orden nace ligada a esa sucursal y sigue el flujo real hacia admin y kitchen.",
  },
] as const

const platformHighlights = [
  {
    icon: Store,
    title: "Marketplace público",
    description: "Una entrada general para descubrir marcas y pasar al storefront correcto.",
  },
  {
    icon: MapPinned,
    title: "Sucursal real",
    description: "Cada link puede entrar con una branch preseleccionada para operar sin fricción.",
  },
  {
    icon: ShieldCheck,
    title: "Backoffice separado",
    description: "Admin, staff y kitchen viven fuera de la experiencia pública del cliente.",
  },
] as const

type HomePageBrand = {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly cuisine: string
  readonly headline: string
  readonly nearestBranch: string
  readonly etaMinutes: number
  readonly accent: string
  readonly storefrontHref: string
  readonly logoImageUrl?: string | null
}

type HomePageProps = {
  readonly featuredDirectoryBrands?: readonly HomePageBrand[]
}

export function HomePage({ featuredDirectoryBrands = [] }: HomePageProps) {
  const heroBrands =
    featuredDirectoryBrands.length > 0
      ? featuredDirectoryBrands
      : featuredBrands.map((brand) => ({
          ...brand,
          storefrontHref: `/app/${brand.slug}`,
          logoImageUrl: null,
        }))

  return (
    <main className={`${bodyFont.className} relative isolate flex flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,_#f6efe4_0%,_#f4eadc_26%,_#f8f5ef_60%,_#fcfbf8_100%)] text-stone-950`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.18),_transparent_28%),radial-gradient(circle_at_85%_18%,_rgba(217,119,6,0.18),_transparent_24%),linear-gradient(rgba(120,53,15,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.05)_1px,transparent_1px)] [background-size:auto,auto,44px_44px,44px_44px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.28),_transparent_58%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-stone-950/10 bg-white/70 px-5 py-4 shadow-[0_22px_70px_rgba(120,53,15,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-[1.15rem] bg-stone-950 text-sm font-bold tracking-[0.18em] text-white">
              VZ
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Public entry</p>
              <p className="text-sm text-stone-600">{platformName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href="/brands">
              Explorar tiendas
            </Link>
            <Link className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href="/signup/business">
              Registrar negocio
            </Link>
            <Link className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600" href="/auth/admin/login">
              Acceso negocios
            </Link>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-950/10 bg-stone-950 px-6 py-7 text-white shadow-[0_30px_100px_rgba(28,25,23,0.22)] md:px-8 md:py-9">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.22),_transparent_30%),radial-gradient(circle_at_78%_18%,_rgba(245,158,11,0.18),_transparent_22%)]" />
            <div className="relative flex h-full flex-col gap-8">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-orange-200">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">Marketplace</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">Storefronts por sucursal</span>
              </div>

              <div className="space-y-5">
                <h1 className={`${displayFont.className} max-w-4xl text-5xl leading-[0.9] font-normal tracking-tight sm:text-6xl lg:text-7xl`}>
                  Descubre tiendas, entra a la sucursal correcta y pide con contexto real.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-stone-200 sm:text-lg">
                  La ruta raíz ya no es una pantalla técnica. Es la entrada pública al ecosistema: descubre marcas, abre su storefront y aterriza en la branch que realmente operará tu pedido.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-400" href="/brands">
                  Ver tiendas públicas
                  <ArrowRight className="size-4" />
                </Link>
                <Link className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15" href="/app/demo-brand">
                  Abrir demo storefront
                  <ExternalLink className="size-4" />
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {platformHighlights.map((item) => (
                  <article key={item.title} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <item.icon className="mb-3 size-5 text-orange-300" />
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-300">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-[2rem] border border-stone-950/10 bg-white/80 p-6 shadow-[0_22px_70px_rgba(120,53,15,0.08)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Cómo entra el público</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">Una entrada general, varios caminos útiles.</h2>
                </div>
                <div className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-800">
                  Root /
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {publicFlow.map((step, index) => (
                  <div key={step.title} className="grid gap-3 rounded-[1.35rem] border border-stone-200 bg-stone-50/85 p-4 md:grid-cols-[2.5rem_1fr] md:items-start">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-950 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-stone-950">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-stone-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[2rem] border border-stone-950/10 bg-[linear-gradient(180deg,_#fff7ed_0%,_#fffdf8_100%)] p-6 shadow-[0_22px_70px_rgba(120,53,15,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Rutas públicas</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">Arquitectura clara para el cliente.</h2>
                </div>
                <Users className="size-5 text-orange-700" />
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3">
                  <p className="font-semibold text-stone-950">`/`</p>
                  <p className="mt-1 text-stone-600">Entrada general a la plataforma y punto de descubrimiento.</p>
                </div>
                <div className="rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3">
                  <p className="font-semibold text-stone-950">`/brands`</p>
                  <p className="mt-1 text-stone-600">Directorio público de marcas y tiendas.</p>
                </div>
                <div className="rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3">
                  <p className="font-semibold text-stone-950">`/app/[tenantSlug]`</p>
                  <p className="mt-1 text-stone-600">Storefront público de una marca.</p>
                </div>
                <div className="rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3">
                  <p className="font-semibold text-stone-950">`?branch=`</p>
                  <p className="mt-1 text-stone-600">Entrada pública directa a una sucursal específica.</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Tiendas destacadas</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">Puertas de entrada reales al marketplace.</h2>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm font-semibold text-stone-950 transition hover:text-orange-700" href="/brands">
              Ver todas las marcas
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {heroBrands.map((brand, index) => (
              <article
                key={brand.id}
                className="group relative overflow-hidden rounded-[2rem] border border-stone-950/10 bg-white/80 p-6 shadow-[0_22px_70px_rgba(120,53,15,0.08)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(120,53,15,0.14)]"
              >
                <div className={`absolute inset-x-6 top-0 h-2 rounded-b-full bg-gradient-to-r ${brand.accent}`} />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <TenantBrandMark name={brand.name} logoImageUrl={brand.logoImageUrl} size="lg" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-500">#{index + 1} tienda destacada</p>
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
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700">{brand.nearestBranch}</span>
                  </div>

                  <div className="mt-6 grid gap-3 rounded-[1.35rem] border border-stone-200 bg-stone-50/85 p-4 text-sm text-stone-600">
                    <div className="flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-2">
                        <MapPinned className="size-4 text-orange-700" />
                        Sucursal sugerida
                      </span>
                      <span className="font-semibold text-stone-950">{brand.nearestBranch}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-2">
                        <TimerReset className="size-4 text-orange-700" />
                        Canal
                      </span>
                      <span className="font-semibold text-stone-950">Pickup y delivery</span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <Link
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-orange-600"
                      href={brand.storefrontHref}
                    >
                      Ver tienda
                      <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950"
                      href="/brands"
                    >
                      Comparar
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 rounded-[2.3rem] border border-stone-950/10 bg-white/75 p-6 shadow-[0_22px_70px_rgba(120,53,15,0.08)] backdrop-blur lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Para negocios</p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-950">La parte pública ya conversa con la operación interna.</h2>
            <p className="text-base leading-7 text-stone-600">
              Un cliente entra por marketplace o link directo, cae en una sucursal concreta y esa decisión ya viaja hasta admin y kitchen. La experiencia pública deja de estar separada de la realidad operativa.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.4rem] bg-stone-50 p-5">
              <Building2 className="mb-3 size-5 text-orange-700" />
              <p className="font-semibold text-stone-950">Admin</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">Control de pagos, sucursales, staff y links públicos por branch.</p>
            </article>
            <article className="rounded-[1.4rem] bg-stone-50 p-5">
              <Users className="mb-3 size-5 text-orange-700" />
              <p className="font-semibold text-stone-950">Staff</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">Roles distintos para manager, branch manager y preparer según la operación.</p>
            </article>
            <article className="rounded-[1.4rem] bg-stone-50 p-5">
              <MapPinned className="mb-3 size-5 text-orange-700" />
              <p className="font-semibold text-stone-950">Sucursal</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">Precios y disponibilidad viven en la branch activa, no en una demo genérica.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
