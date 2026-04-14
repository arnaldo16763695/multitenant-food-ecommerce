import { AdminPasswordRecoveryForm } from "@/components/auth/admin-password-recovery-form"

export default function AdminForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_30%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)] px-6 py-16">
      <div className="grid gap-6 text-center">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-700">VZ Food Admin</p>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950">Recupera tu password.</h1>
          <p className="mx-auto max-w-xl text-sm leading-7 text-stone-600">
            Te enviaremos un enlace seguro para definir una nueva contrasena y volver al login del panel.
          </p>
        </div>

        <AdminPasswordRecoveryForm />
      </div>
    </main>
  )
}
