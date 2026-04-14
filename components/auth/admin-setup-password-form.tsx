"use client"

import { PasswordResetForm } from "@/components/auth/password-reset-form"

type AdminSetupPasswordFormProps = {
  readonly nextPath: string
}

export function AdminSetupPasswordForm({ nextPath }: AdminSetupPasswordFormProps) {
  return (
    <PasswordResetForm
      nextPath={`/auth/admin/login?next=${encodeURIComponent(nextPath)}&reason=password-set`}
      cardTitle="Activa tu acceso"
      initialLoadingMessage="Validando tu acceso..."
      readyMessage="Define tu contrasena para usar este acceso todos los dias."
      submitLabel="Guardar contrasena"
    />
  )
}
