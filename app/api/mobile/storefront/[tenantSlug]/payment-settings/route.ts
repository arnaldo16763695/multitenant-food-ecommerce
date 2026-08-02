import { getTenantManualPaymentSettingsBySlug } from "@/lib/services/orders"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { mobileError, mobileJson } from "@/lib/mobile/api"

type MobilePaymentSettingsRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export async function GET(_request: Request, context: MobilePaymentSettingsRouteContext) {
  const { tenantSlug } = await context.params
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return mobileError(500, "Supabase admin client is not configured.")
  }

  const settings = await getTenantManualPaymentSettingsBySlug(supabase, tenantSlug)

  if (!settings) {
    return mobileError(404, "Payment settings not found for this storefront.")
  }

  return mobileJson({ settings })
}
