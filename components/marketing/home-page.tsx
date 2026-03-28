import Link from "next/link";

import { featuredBrands, phaseOnePlan, platformName, platformSurfaces } from "@/lib/config/platform";

export function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-20 px-6 py-10 sm:px-10 lg:px-12">
      <section className="grid gap-10 overflow-hidden rounded-[2rem] border border-white/50 bg-[radial-gradient(circle_at_top_left,_rgba(253,186,116,0.42),_transparent_34%),linear-gradient(135deg,_#fff7ed_0%,_#fffbeb_38%,_#ffffff_100%)] p-8 shadow-[0_20px_80px_rgba(120,53,15,0.12)] lg:grid-cols-[1.3fr_0.9fr] lg:p-12">
        <div className="flex flex-col gap-6">
          <div className="inline-flex w-fit items-center rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-medium text-orange-900 shadow-sm">
            Fase 1 en marcha - base del SaaS multi-tenant
          </div>

          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-orange-700">
              {platformName}
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
              Marketplace multi-marca con storefront, admin y kitchen sobre una base lista para escalar.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-700">
              Este kickoff reemplaza el starter generico por una direccion de producto real: marcas independientes,
              sucursales priorizadas por cercania y una arquitectura preparada para web, operacion y futura app movil.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              href="/brands"
            >
              Ver marketplace inicial
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-950"
              href="/app/demo-brand"
            >
              Revisar shell tenant-aware
            </Link>
          </div>
        </div>

        <div className="grid gap-4 rounded-[1.5rem] bg-stone-950 p-5 text-stone-50 shadow-2xl">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm text-stone-300">Marketplace ranking</p>
              <p className="text-base font-semibold">Nearest branch first</p>
            </div>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
              pickup + delivery
            </span>
          </div>

          <div className="grid gap-3">
            {featuredBrands.map((brand) => (
              <article key={brand.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className={`mb-4 h-2 rounded-full bg-gradient-to-r ${brand.accent}`} />
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm uppercase tracking-[0.24em] text-stone-400">{brand.cuisine}</p>
                    <h2 className="text-xl font-semibold">{brand.name}</h2>
                    <p className="text-sm leading-6 text-stone-300">{brand.headline}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-400">ETA</p>
                    <p className="text-lg font-semibold">{brand.etaMinutes} min</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-stone-300">
                  <span>{brand.nearestBranch}</span>
                  <Link className="font-semibold text-white transition hover:text-orange-300" href={`/app/${brand.slug}`}>
                    Abrir marca
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        {platformSurfaces.map((surface) => (
          <Link
            key={surface.name}
            className="group rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_12px_40px_rgba(28,25,23,0.07)] transition hover:-translate-y-1 hover:border-orange-300"
            href={surface.href}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-orange-700">Surface</p>
            <h2 className="mt-4 text-2xl font-semibold text-stone-950">{surface.name}</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">{surface.description}</p>
            <span className="mt-8 inline-flex text-sm font-semibold text-stone-950 transition group-hover:text-orange-700">
              Explorar
            </span>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(28,25,23,0.07)] lg:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-700">Fase 1</p>
          <h2 className="text-3xl font-semibold tracking-tight text-stone-950">
            Primera iteracion corta, ordenada y sin alcance inflado.
          </h2>
          <p className="text-base leading-7 text-stone-600">
            La fase inicial no busca resolver todo el producto. Busca fijar una base clara para tenancy, rutas y
            superficies principales, de forma que el siguiente sprint ya pueda entrar a Supabase y modelo de datos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {phaseOnePlan.map((phase) => (
            <article key={phase.name} className="rounded-[1.5rem] bg-stone-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">{phase.name}</p>
              <p className="mt-3 text-lg font-semibold text-stone-950">{phase.goal}</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
                {phase.deliverables.map((deliverable) => (
                  <li key={deliverable} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-orange-500" />
                    <span>{deliverable}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
