"use server"

import { buildAdminResetPasswordUrl } from "@/lib/auth/admin-access"
import { sendPasswordRecoveryEmail } from "@/lib/email/password-recovery"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type RequestAdminPasswordRecoveryPayload = {
  readonly email: string
}

type ProfileRow = {
  id: string
  full_name: string | null
}

export async function requestAdminPasswordRecoveryAction(payload: RequestAdminPasswordRecoveryPayload) {
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

  const profileResult = await adminClient.from("profiles").select("id, full_name").ilike("email", email).limit(1).maybeSingle<ProfileRow>()

  if (profileResult.error) {
    return {
      ok: false as const,
      error: profileResult.error.message,
    }
  }

  if (!profileResult.data) {
    return {
      ok: true as const,
      delivery: "none" as const,
    }
  }

  const [tenantMembershipResult, platformMembershipResult] = await Promise.all([
    adminClient
      .from("tenant_memberships")
      .select("id")
      .eq("profile_id", profileResult.data.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle<{ id: string }>(),
    adminClient
      .from("platform_memberships")
      .select("id")
      .eq("profile_id", profileResult.data.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle<{ id: string }>(),
  ])

  if (tenantMembershipResult.error || platformMembershipResult.error) {
    return {
      ok: false as const,
      error: tenantMembershipResult.error?.message ?? platformMembershipResult.error?.message ?? "No pudimos validar el acceso del usuario.",
    }
  }

  if (!tenantMembershipResult.data && !platformMembershipResult.data) {
    return {
      ok: true as const,
      delivery: "none" as const,
    }
  }

  const linkResult = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: buildAdminResetPasswordUrl("/auth/admin/login?reason=password-reset"),
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
    fullName: profileResult.data.full_name?.trim() || "equipo",
    subject: "Restablece tu password de admin",
    eyebrow: "VZ Food Admin",
    headline: "Restablece tu acceso",
    body: "usa este enlace para crear un password nuevo y volver a entrar a tu panel.",
    recoveryUrl: linkResult.data.properties.action_link,
    fallbackTag: "admin-password-recovery-link",
  })

  return {
    ok: true as const,
    delivery: emailResult.deliveredBy,
  }
}
