import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseEnv } from "@/lib/supabase/env"

export function createSupabaseMobileClient(accessToken: string): SupabaseClient | null {
  const env = getSupabaseEnv()

  if (!env) {
    return null
  }

  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
