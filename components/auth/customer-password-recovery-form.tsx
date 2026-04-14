"use client"

import { requestCustomerPasswordRecoveryAction } from "@/app/app/[tenantSlug]/account/forgot-password/actions"
import { PasswordRecoveryRequestForm } from "@/components/auth/password-recovery-request-form"

type CustomerPasswordRecoveryFormProps = {
  readonly tenantSlug: string
}

export function CustomerPasswordRecoveryForm({ tenantSlug }: CustomerPasswordRecoveryFormProps) {
  return (
    <PasswordRecoveryRequestForm
      title="Olvide mi password"
      description="Si el email existe en nuestra base de clientes, te enviaremos un enlace seguro para recuperarlo."
      submitLabel="Enviar enlace de recuperacion"
      successMessage="Si el email existe en nuestra base de clientes, te enviamos un enlace para restablecer tu password."
      backHref={`/app/${tenantSlug}/account/login`}
      backLabel="Volver al login"
      submitAction={(payload) => requestCustomerPasswordRecoveryAction({ tenantSlug, email: payload.email })}
    />
  )
}
