import { NextResponse } from "next/server"

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization")?.trim()

  if (!authorization) {
    return null
  }

  const [scheme, token] = authorization.split(/\s+/, 2)

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null
  }

  return token
}

export function mobileJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  })
}

export function mobileError(status: number, error: string) {
  return mobileJson({ error }, { status })
}
