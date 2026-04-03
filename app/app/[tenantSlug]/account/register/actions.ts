"use server"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type ProvisionCustomerAccountInput = {
  readonly authUserId: string
  readonly email: string
  readonly fullName: string
  readonly phone: string
  readonly marketingOptIn: boolean
}

type ProvisionCustomerAccountResult = {
  readonly ok: boolean
  readonly error?: string
}

type ProfileRow = {
  id: string
}

type CustomerRow = {
  id: string
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
