import { NextResponse, type NextRequest } from "next/server"

import { createServerClient, type CookieOptions } from "@supabase/ssr"

import { getSupabaseEnv } from "@/lib/supabase/env"

export async function GET(request: NextRequest) {
  const env = getSupabaseEnv()
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const nextPath = requestUrl.searchParams.get("next") || "/auth/admin/login"

  const redirectUrl = new URL(nextPath.startsWith("/") ? nextPath : "/auth/admin/login", requestUrl.origin)
  const response = NextResponse.redirect(redirectUrl)

  if (!env) {
    return NextResponse.redirect(new URL("/auth/admin/login?reason=supabase-env", requestUrl.origin))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth/admin/login?reason=auth-code", requestUrl.origin))
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: true,
    },
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 })
      },
    },
  })

  const exchangeResult = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeResult.error) {
    return NextResponse.redirect(new URL("/auth/admin/login?reason=auth-session", requestUrl.origin))
  }

  return response
}
