import Link from "next/link"

import { BusinessSignupForm } from "@/components/platform/business-signup-form"

export default function BusinessSignupPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_28%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10 lg:px-12">
        <section className="grid gap-8 rounded-[2.2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_18px_50px_rgba(28,25,23,0.08)] backdrop-blur lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Business Signup</p>
            <h1 className="text-5xl font-semibold leading-[0.92] tracking-tight text-stone-950">
              Registra tu empresa y prepara el alta de tu tenant.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-stone-600">
              Este flujo crea una solicitud comercial base. Luego puedes aprobarla desde el panel de plataforma y generar el tenant, su owner y la sucursal principal.
            </p>
            <div className="grid gap-3 rounded-[1.6rem] bg-stone-50 p-5 text-sm text-stone-600">
              <p>1. Registras la empresa</p>
              <p>2. Plataforma revisa la solicitud</p>
              <p>3. Se provisiona tenant, owner y branch principal</p>
            </div>
            <Link className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href="/">
              Volver al inicio
            </Link>
          </div>

          <BusinessSignupForm />
        </section>
      </div>
    </main>
  )
}
