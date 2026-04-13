import Link from "next/link"

export default function BusinessSignupSuccessPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_28%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-14 text-center sm:px-10">
        <section className="rounded-[2rem] border border-stone-200 bg-white/90 p-8 shadow-[0_18px_50px_rgba(28,25,23,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Solicitud enviada</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950">Tu empresa ya quedo registrada para revision.</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            El siguiente paso es revisar la solicitud desde el panel de plataforma y provisionar el tenant para iniciar onboarding.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600" href="/">
              Volver al inicio
            </Link>
            <Link className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href="/auth/admin/login">
              Acceso plataforma
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
