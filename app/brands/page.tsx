import Link from "next/link";

import { featuredBrands } from "@/lib/config/platform";

export default function BrandsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 sm:px-10">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-700">Marketplace</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-stone-950">Marcas visibles para discovery.</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
              Esta pantalla fija el tono del marketplace: primero se muestran marcas y sucursales elegibles, luego se
              ordenan por cercania y capacidad operativa.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-orange-200 bg-orange-50 px-5 py-4 text-sm leading-6 text-orange-950">
            Proxima integracion: geolocalizacion real + RPC para seleccionar la mejor sucursal.
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {featuredBrands.map((brand) => (
          <article key={brand.id} className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_12px_40px_rgba(28,25,23,0.07)]">
            <div className={`mb-5 h-3 rounded-full bg-gradient-to-r ${brand.accent}`} />
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">{brand.cuisine}</p>
              <h2 className="text-2xl font-semibold text-stone-950">{brand.name}</h2>
              <p className="text-sm leading-7 text-stone-600">{brand.headline}</p>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3 rounded-[1.25rem] bg-stone-50 p-4 text-sm">
              <div>
                <dt className="text-stone-500">Sucursal sugerida</dt>
                <dd className="mt-1 font-semibold text-stone-950">{brand.nearestBranch}</dd>
              </div>
              <div>
                <dt className="text-stone-500">ETA base</dt>
                <dd className="mt-1 font-semibold text-stone-950">{brand.etaMinutes} min</dd>
              </div>
            </dl>
            <Link
              className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              href={`/app/${brand.slug}`}
            >
              Ver marca
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
