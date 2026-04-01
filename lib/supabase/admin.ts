import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseEnv, getSupabaseServiceRoleEnv } from "@/lib/supabase/env"

export function createSupabaseAdminClient(): SupabaseClient | null {
  const serviceRoleEnv = getSupabaseServiceRoleEnv()

  if (serviceRoleEnv) {
    return createClient(serviceRoleEnv.url, serviceRoleEnv.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  const env = getSupabaseEnv()

  if (!env) {
    return null
  }

  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
