"use server"

import { revalidatePath } from "next/cache"

import { getCustomerAccountContext } from "@/lib/auth/customer"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type SetWhatsappOptInResult =
  | { readonly ok: true; readonly optIn: boolean }
  | { readonly ok: false; readonly error: string }

export async function setCustomerWhatsappOptInAction(
  tenantSlug: string,
  optIn: boolean
): Promise<SetWhatsappOptInResult> {
  const customerContext = await getCustomerAccountContext()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para continuar." }
  }

  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const updateResult = await supabase
    .from("customers")
    .update({ whatsapp_opt_in: optIn })
    .eq("id", customerContext.customer.id)

  if (updateResult.error) {
    return { ok: false, error: "No pudimos guardar tu preferencia. Intenta de nuevo." }
  }

  revalidatePath(`/app/${tenantSlug}/account`)

  return { ok: true, optIn }
}
