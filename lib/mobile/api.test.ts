import { describe, expect, it } from "vitest"

import { getBearerToken, mobileError, mobileJson } from "@/lib/mobile/api"

describe("getBearerToken", () => {
  it("extracts bearer tokens case-insensitively", () => {
    const request = new Request("https://example.com", {
      headers: {
        authorization: "Bearer token-123",
      },
    })

    expect(getBearerToken(request)).toBe("token-123")
  })

  it("returns null when the scheme is not bearer", () => {
    const request = new Request("https://example.com", {
      headers: {
        authorization: "Basic token-123",
      },
    })

    expect(getBearerToken(request)).toBeNull()
  })

  it("returns null when the token is missing", () => {
    const request = new Request("https://example.com", {
      headers: {
        authorization: "Bearer",
      },
    })

    expect(getBearerToken(request)).toBeNull()
  })
})

describe("mobileJson", () => {
  it("returns no-store json responses by default", async () => {
    const response = mobileJson({ ok: true })

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it("preserves custom headers and status", async () => {
    const response = mobileJson(
      { ok: true },
      {
        status: 202,
        headers: {
          "X-Test": "enabled",
        },
      }
    )

    expect(response.status).toBe(202)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(response.headers.get("X-Test")).toBe("enabled")
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})

describe("mobileError", () => {
  it("returns a json error payload with the provided status", async () => {
    const response = mobileError(401, "Missing Bearer token.")

    expect(response.status).toBe(401)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    await expect(response.json()).resolves.toEqual({ error: "Missing Bearer token." })
  })
})
