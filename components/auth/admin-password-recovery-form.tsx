"use client"

import { requestAdminPasswordRecoveryAction } from "@/app/auth/admin/forgot-password/actions"
import { PasswordRecoveryRequestForm } from "@/components/auth/password-recovery-request-form"

export function AdminPasswordRecoveryForm() {
  return (
    <PasswordRecoveryRequestForm
      title="Olvide mi password"
      description="Si el email tiene acceso admin, te enviaremos un enlace seguro para restablecerlo."
      submitLabel="Enviar enlace de recuperacion"
      successMessage="Si el email tiene acceso admin, te enviamos un enlace para restablecer tu password."
      backHref="/auth/admin/login"
      backLabel="Volver al login admin"
      submitAction={requestAdminPasswordRecoveryAction}
    />
  )
}
