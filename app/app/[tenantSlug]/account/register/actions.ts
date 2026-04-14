"use server"

import { getAppUrl } from "@/lib/auth/app-url"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { sendCustomerConfirmationEmail } from "@/lib/email/customer-auth"

type ProvisionCustomerAccountInput = {
  readonly authUserId: string
  readonly email: string
  readonly fullName: string
  readonly phone: string
  readonly marketingOptIn: boolean
}

type ProvisionCustomerAccountResult = {
  readonly ok: boolean
  readonly delivery?: "resend" | "console"
  readonly error?: string
}

type ProfileRow = {
  id: string
}

type CustomerRow = {
  id: string
}

type RegisterCustomerAccountInput = {
  readonly tenantSlug: string
  readonly email: string
  readonly fullName: string
  readonly phone: string
  readonly password: string
  readonly marketingOptIn: boolean
}

type ResendCustomerConfirmationInput = {
  readonly tenantSlug: string
  readonly email: string
}

export async function provisionCustomerAccountAction(input: ProvisionCustomerAccountInput): Promise<ProvisionCustomerAccountResult> {
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const profileResult = await adminClient
    .from("profiles")
    .upsert(
      {
        auth_user_id: input.authUserId,
        email: input.email,
        full_name: input.fullName,
      },
      {
        onConflict: "auth_user_id",
      }
    )
    .select("id")
    .single<ProfileRow>()

  if (profileResult.error) {
    return { ok: false, error: profileResult.error.message }
  }

  const customerResult = await adminClient
    .from("customers")
    .upsert(
      {
        profile_id: profileResult.data.id,
        email: input.email,
        phone: input.phone,
        full_name: input.fullName,
        marketing_opt_in: input.marketingOptIn,
      },
      {
        onConflict: "profile_id",
      }
    )
    .select("id")
    .single<CustomerRow>()

  if (customerResult.error) {
    return { ok: false, error: customerResult.error.message }
  }

  return { ok: true }
}

export async function registerCustomerAccountAction(input: RegisterCustomerAccountInput): Promise<ProvisionCustomerAccountResult> {
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const signUpLinkResult = await adminClient.auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        phone: input.phone,
      },
      redirectTo: `${getAppUrl()}/app/${input.tenantSlug}/account`,
    },
  })

  if (signUpLinkResult.error || !signUpLinkResult.data?.user || !signUpLinkResult.data.properties?.action_link) {
    return {
      ok: false,
      error: signUpLinkResult.error?.message ?? "No pudimos crear la cuenta del cliente.",
    }
  }

  const provisionResult = await provisionCustomerAccountAction({
    authUserId: signUpLinkResult.data.user.id,
    email: input.email,
    fullName: input.fullName,
    phone: input.phone,
    marketingOptIn: input.marketingOptIn,
  })

  if (!provisionResult.ok) {
    return provisionResult
  }

  const emailResult = await sendCustomerConfirmationEmail({
    email: input.email,
    fullName: input.fullName,
    tenantSlug: input.tenantSlug,
    confirmationUrl: signUpLinkResult.data.properties.action_link,
  })

  return {
    ok: true,
    delivery: emailResult.deliveredBy,
  }
}

export async function resendCustomerConfirmationAction(input: ResendCustomerConfirmationInput): Promise<ProvisionCustomerAccountResult> {
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const customerResult = await adminClient
    .from("customers")
    .select("full_name")
    .eq("email", input.email)
    .limit(1)
    .maybeSingle<{ full_name: string | null }>()

  const linkResult = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: input.email,
    options: {
      redirectTo: `${getAppUrl()}/app/${input.tenantSlug}/account`,
    },
  })

  if (linkResult.error || !linkResult.data?.properties?.action_link) {
    return {
      ok: false,
      error: linkResult.error?.message ?? "No pudimos reenviar el link de confirmación.",
    }
  }

  const emailResult = await sendCustomerConfirmationEmail({
    email: input.email,
    fullName: customerResult.data?.full_name ?? "cliente",
    tenantSlug: input.tenantSlug,
    confirmationUrl: linkResult.data.properties.action_link,
  })

  return {
    ok: true,
    delivery: emailResult.deliveredBy,
  }
}
