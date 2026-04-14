"use server"

import { getAppUrl } from "@/lib/auth/app-url"
import { sendPasswordRecoveryEmail } from "@/lib/email/password-recovery"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type RequestCustomerPasswordRecoveryPayload = {
  readonly tenantSlug: string
  readonly email: string
}

type CustomerRow = {
  full_name: string | null
}

function buildCustomerResetPasswordUrl(tenantSlug: string, nextPath: string) {
  return `${getAppUrl()}/app/${tenantSlug}/account/reset-password?next=${encodeURIComponent(nextPath)}`
}

export async function requestCustomerPasswordRecoveryAction(payload: RequestCustomerPasswordRecoveryPayload) {
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const email = payload.email.trim().toLowerCase()

  if (!email) {
    return {
      ok: false as const,
      error: "Ingresa un email valido.",
    }
  }

  const customerResult = await adminClient
    .from("customers")
    .select("full_name")
    .ilike("email", email)
    .limit(1)
    .maybeSingle<CustomerRow>()

  if (customerResult.error) {
    return {
      ok: false as const,
      error: customerResult.error.message,
    }
  }

  if (!customerResult.data) {
    return {
      ok: true as const,
      delivery: "none" as const,
    }
  }

  const linkResult = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: buildCustomerResetPasswordUrl(payload.tenantSlug, `/app/${payload.tenantSlug}/account/login?reason=password-reset`),
    },
  })

  if (linkResult.error || !linkResult.data?.properties?.action_link) {
    return {
      ok: false as const,
      error: linkResult.error?.message ?? "No pudimos generar el enlace de recuperacion.",
    }
  }

  const emailResult = await sendPasswordRecoveryEmail({
    email,
    fullName: customerResult.data.full_name?.trim() || "cliente",
    subject: `Restablece tu password en ${payload.tenantSlug}`,
    eyebrow: "VZ Food",
    headline: "Restablece tu acceso",
    body: `usa este enlace para crear un password nuevo y volver a entrar en ${payload.tenantSlug}.`,
    recoveryUrl: linkResult.data.properties.action_link,
    fallbackTag: "customer-password-recovery-link",
  })

  return {
    ok: true as const,
    delivery: emailResult.deliveredBy,
  }
}
