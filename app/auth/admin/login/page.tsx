import { AdminLoginForm } from "@/components/auth/admin-login-form"

type AdminLoginPageProps = {
  readonly searchParams: Promise<{
    next?: string
    reason?: string
  }>
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_30%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)] px-6 py-16">
      <div className="grid gap-6 text-center">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-700">VZ Food Admin</p>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950">Inicia sesion para entrar al panel.</h1>
          <p className="mx-auto max-w-xl text-sm leading-7 text-stone-600">
            Esta vista protege el admin multi-tenant y valida que el usuario tenga acceso real al tenant antes de entrar.
          </p>
        </div>
        <AdminLoginForm nextPath={params.next} reason={params.reason} />
      </div>
    </main>
  )
}
