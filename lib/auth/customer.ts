import { createSupabaseServerClient } from "@/lib/supabase/server"

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

  const profileResult = await supabase.from("profiles").select("id, full_name, email").eq("auth_user_id", user.id).limit(1).maybeSingle<ProfileRow>()

  if (profileResult.error || !profileResult.data) {
    return null
  }

  const customerResult = await supabase.from("customers").select("id, full_name, email, phone, marketing_opt_in").eq("profile_id", profileResult.data.id).limit(1).maybeSingle<CustomerRow>()

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
