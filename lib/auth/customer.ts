import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type CustomerAccountContext = {
  readonly user: {
    id: string
    email: string
  }
  readonly profile: {
    id: string
    fullName: string | null
    email: string | null
  }
  readonly customer: {
    id: string
    fullName: string | null
    email: string | null
    phone: string | null
    marketingOptIn: boolean
  }
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type CustomerRow = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  marketing_opt_in: boolean
}

async function provisionMissingCustomerAccount(input: {
  readonly authUserId: string
  readonly email: string
  readonly fullName: string | null
  readonly phone: string | null
}) {
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return
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

  if (profileResult.error || !profileResult.data) {
    return
  }

  await adminClient.from("customers").upsert(
    {
      profile_id: profileResult.data.id,
      email: input.email,
      phone: input.phone,
      full_name: input.fullName,
      marketing_opt_in: false,
    },
    {
      onConflict: "profile_id",
    }
  )
}

export async function getCustomerAccountContext(): Promise<CustomerAccountContext | null> {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id || !user.email) {
    return null
  }

  // A signed-in user can also act as a storefront customer, even if they originally entered through an admin flow.
  let profileResult = await supabase.from("profiles").select("id, full_name, email").eq("auth_user_id", user.id).limit(1).maybeSingle<ProfileRow>()

  if (profileResult.error || !profileResult.data) {
    await provisionMissingCustomerAccount({
      authUserId: user.id,
      email: user.email,
      fullName: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null,
      phone: typeof user.user_metadata.phone === "string" ? user.user_metadata.phone : null,
    })

    profileResult = await supabase.from("profiles").select("id, full_name, email").eq("auth_user_id", user.id).limit(1).maybeSingle<ProfileRow>()
  }

  if (profileResult.error || !profileResult.data) {
    return null
  }

  let customerResult = await supabase.from("customers").select("id, full_name, email, phone, marketing_opt_in").eq("profile_id", profileResult.data.id).limit(1).maybeSingle<CustomerRow>()

  if (customerResult.error || !customerResult.data) {
    await provisionMissingCustomerAccount({
      authUserId: user.id,
      email: user.email,
      fullName:
        profileResult.data.full_name ?? (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null),
      phone: typeof user.user_metadata.phone === "string" ? user.user_metadata.phone : null,
    })

    customerResult = await supabase.from("customers").select("id, full_name, email, phone, marketing_opt_in").eq("profile_id", profileResult.data.id).limit(1).maybeSingle<CustomerRow>()
  }

  if (customerResult.error || !customerResult.data) {
    return null
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      id: profileResult.data.id,
      fullName: profileResult.data.full_name,
      email: profileResult.data.email,
    },
    customer: {
      id: customerResult.data.id,
      fullName: customerResult.data.full_name,
      email: customerResult.data.email,
      phone: customerResult.data.phone,
      marketingOptIn: customerResult.data.marketing_opt_in,
    },
  }
}
