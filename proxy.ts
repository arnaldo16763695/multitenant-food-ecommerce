import { type NextRequest, NextResponse } from "next/server"

import { createServerClient } from "@supabase/ssr"

import { getPublicStorefrontByDomain } from "@/lib/data/public-storefront"

const INTERNAL_HOST_PATTERNS = ["localhost", "127.0.0.1", ".vercel.app"]

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  if (pathname === "/") {
    const host = request.headers.get("host") ?? ""
    const normalizedHost = host.toLowerCase().split(":")[0]
    const isInternalHost = INTERNAL_HOST_PATTERNS.some((pattern) => normalizedHost === pattern || normalizedHost.endsWith(pattern))

    if (!isInternalHost) {
      const storefront = await getPublicStorefrontByDomain(normalizedHost)

      if (storefront) {
        const rewriteUrl = request.nextUrl.clone()
        rewriteUrl.pathname = `/app/${storefront.tenant.slug}`

        return NextResponse.rewrite(rewriteUrl)
      }
    }
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options) {
        request.cookies.set({ name, value })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options) {
        request.cookies.set({ name, value: "" })
        response.cookies.set({ name, value: "", ...options, maxAge: 0 })
      },
    },
  })

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ["/", "/app/:path*", "/auth/:path*"],
}
