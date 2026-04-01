import { cookies } from "next/headers"

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseEnv } from "@/lib/supabase/env"

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const env = getSupabaseEnv()

  if (!env) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(env.url, env.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: true,
    },
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Server Components can read auth cookies safely, while writes happen in middleware and auth events.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 })
        } catch {
          // Server Components can read auth cookies safely, while writes happen in middleware and auth events.
        }
      },
    },
  })
}
