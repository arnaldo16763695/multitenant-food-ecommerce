import { PasswordResetForm } from "@/components/auth/password-reset-form"

type AdminResetPasswordPageProps = {
  readonly searchParams: Promise<{
    next?: string
  }>
}

export default async function AdminResetPasswordPage({ searchParams }: AdminResetPasswordPageProps) {
  const params = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_30%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)] px-6 py-16">
      <div className="grid gap-6 text-center">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-700">VZ Food Admin</p>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950">Crea tu nuevo password.</h1>
          <p className="mx-auto max-w-xl text-sm leading-7 text-stone-600">
            Este enlace es temporal. Cuando guardes tu nueva contrasena, te llevaremos de vuelta al login admin.
          </p>
        </div>

        <PasswordResetForm
          nextPath={params.next ?? "/auth/admin/login?reason=password-reset"}
          cardTitle="Restablecer password"
          initialLoadingMessage="Validando tu enlace de recuperacion..."
          readyMessage="Define una contrasena nueva para volver a entrar al panel."
          submitLabel="Guardar nuevo password"
        />
      </div>
    </main>
  )
}
