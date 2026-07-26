import { getMobileCustomerAccountContext, type MobileCustomerAccountContext } from "@/lib/auth/customer-mobile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseMobileClient } from "@/lib/supabase/mobile"

import { getBearerToken } from "@/lib/mobile/api"

type MobileCustomerAuthResult =
  | {
      readonly ok: true
      readonly customerContext: MobileCustomerAccountContext
      readonly adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
    }
  | {
      readonly ok: false
      readonly status: number
      readonly error: string
    }

export async function authenticateMobileCustomerRequest(request: Request): Promise<MobileCustomerAuthResult> {
  const accessToken = getBearerToken(request)

  if (!accessToken) {
    return { ok: false, status: 401, error: "Missing Bearer token." }
  }

  const mobileClient = createSupabaseMobileClient(accessToken)

  if (!mobileClient) {
    return { ok: false, status: 500, error: "Supabase environment variables are missing." }
  }

  const customerContext = await getMobileCustomerAccountContext(mobileClient)

  if (!customerContext) {
    return { ok: false, status: 401, error: "Customer is not authenticated." }
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { ok: false, status: 500, error: "Supabase admin client is not configured." }
  }

  return {
    ok: true,
    customerContext,
    adminClient,
  }
}
