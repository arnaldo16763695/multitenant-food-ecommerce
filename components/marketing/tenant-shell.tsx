import Link from "next/link"
import { Newsreader } from "next/font/google"
import { Clock3, Flame, MapPinned, ShoppingBag } from "lucide-react"

import type { CustomerAccountContext } from "@/lib/auth/customer"
import { StorefrontBranchEntry } from "@/components/marketing/storefront-branch-entry"
import { StorefrontBranchSelector } from "@/components/marketing/storefront-branch-selector"
import { StorefrontHeader } from "@/components/marketing/storefront-header"
import { StorefrontMenuGrid } from "@/components/marketing/storefront-menu-grid"

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
  readonly requiresBranchSelection?: boolean
  readonly activeBranchId?: string | null
  readonly activeBranchLabel?: string
  readonly branches?: readonly {
    readonly id: string
    readonly name: string
  }[]
  readonly etaMinutes?: number
  readonly shareUrl?: string
  readonly heroImageUrl?: string | null
  readonly customerSession?: Pick<CustomerAccountContext, "user" | "customer"> | null
  readonly menu?: readonly {
    id: string
    name: string
    description: string
    basePrice: string
    category: string
    imageUrl?: string | null
  }[]
}

export function TenantShell({
  tenantSlug,
  title,
  eyebrow,
  description,
  requiresBranchSelection = false,
  activeBranchId,
  activeBranchLabel,
  branches,
  etaMinutes,
  menu,
  shareUrl: _shareUrl,
  heroImageUrl,
  customerSession,
}: TenantShellProps) {
  void _shareUrl
  const publicBranchLabel = activeBranchLabel ?? "Sin sucursal activa"
  const publicEta = etaMinutes ?? 18
  const publicMenu = menu ?? []
  const visibleHeroImage = heroImageUrl ?? null
  const bagHref = activeBranchId ? `/app/${tenantSlug}/bag?branch=${activeBranchId}` : `/app/${tenantSlug}/bag`

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.14),_transparent_26%),linear-gradient(180deg,_#fffaf2_0%,_#fff4e6_38%,_#fffdfa_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(120,53,15,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.07)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <StorefrontHeader
          tenantSlug={tenantSlug}
          brandName={title}
          branchId={requiresBranchSelection ? null : (activeBranchId ?? null)}
          branchLabel={requiresBranchSelection ? "Selecciona sucursal" : publicBranchLabel}
          customerSession={customerSession}
        />

        <section className="overflow-hidden rounded-[2.4rem] border border-stone-950/10 bg-stone-950 shadow-[0_28px_80px_rgba(28,25,23,0.18)]">
          <div
            className="relative min-h-[28rem] bg-cover bg-center"
            style={{
              backgroundImage: visibleHeroImage
                ? `linear-gradient(90deg, rgba(28,25,23,0.88) 0%, rgba(28,25,23,0.62) 38%, rgba(28,25,23,0.22) 100%), url(${visibleHeroImage})`
                : "linear-gradient(135deg, rgba(28,25,23,0.96) 0%, rgba(120,53,15,0.9) 46%, rgba(251,146,60,0.78) 100%)",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.24),_transparent_32%)]" />
            <div className="relative flex h-full flex-col justify-between gap-10 p-6 text-white md:p-8 lg:min-h-[34rem] lg:p-10">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-orange-200">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{eyebrow}</span>
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5">{publicBranchLabel}</span>
              </div>

              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                <div className="max-w-3xl space-y-5">
                  <h1 className={`${displayFont.className} text-5xl leading-[0.92] font-medium tracking-tight sm:text-6xl lg:text-7xl`}>
                    {title}
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-stone-200 sm:text-lg">{description}</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    {!requiresBranchSelection ? (
                      <Link className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-400" href={bagHref}>
                        <ShoppingBag className="size-4" />
                        Ver bolsa
                      </Link>
                    ) : null}
                    {branches && branches.length > 1 && activeBranchId && !requiresBranchSelection ? (
                      <StorefrontBranchSelector activeBranchId={activeBranchId} branches={branches} />
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 rounded-[1.8rem] border border-white/10 bg-black/20 p-4 backdrop-blur-sm md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                    <MapPinned className="mb-3 size-4 text-orange-200" />
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-300">Sucursal</p>
                    <p className="mt-2 text-sm font-semibold text-white">{requiresBranchSelection ? "Elige una sucursal para continuar" : publicBranchLabel}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                    <Clock3 className="mb-3 size-4 text-orange-200" />
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-300">Promesa</p>
                    <p className="mt-2 text-sm font-semibold text-white">{publicEta} min promedio</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                    <Flame className="mb-3 size-4 text-orange-200" />
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-300">Ordena por</p>
                    <p className="mt-2 text-sm font-semibold text-white">Pickup · Delivery</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {requiresBranchSelection && branches && branches.length > 1 ? (
          <StorefrontBranchEntry tenantSlug={tenantSlug} branches={branches} />
        ) : null}

        <section className="space-y-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Menú</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">Nuestros productos</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
                Explora el catálogo completo, filtra por categorías y arma tu pedido sin perder de vista la sucursal activa.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link className="rounded-full border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-800 transition hover:border-stone-950" href="/brands">
                Marketplace
              </Link>
              <Link className="rounded-full border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-800 transition hover:border-stone-950" href={`/app/${tenantSlug}/account/orders`}>
                Mis pedidos
              </Link>
              {!customerSession ? (
                <>
                  <Link className="rounded-full border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-800 transition hover:border-stone-950" href={`/app/${tenantSlug}/account/login`}>
                    Iniciar sesión
                  </Link>
                  <Link className="rounded-full border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-800 transition hover:border-stone-950" href={`/app/${tenantSlug}/account/register`}>
                    Registrarme
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          {!requiresBranchSelection ? (
            publicMenu.length ? (
              <StorefrontMenuGrid tenantSlug={tenantSlug} branchId={activeBranchId ?? ""} menu={publicMenu} />
            ) : (
              <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white/80 px-6 py-14 text-center shadow-[0_18px_50px_rgba(120,53,15,0.06)]">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Menú vacío</p>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950">Esta sucursal aún no tiene productos publicados.</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  Vuelve más tarde o prueba otra sucursal si esta marca opera con múltiples ubicaciones.
                </p>
              </div>
            )
          ) : null}
        </section>
      </div>
    </main>
  )
}
