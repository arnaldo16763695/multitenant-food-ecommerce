import { beforeEach, describe, expect, it, vi } from "vitest"

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}))

import { getPublicStorefrontBySlug } from "@/lib/data/public-storefront"

describe("getPublicStorefrontBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the static demo storefront when Supabase is unavailable", async () => {
    createSupabaseAdminClient.mockReturnValue(null)

    const storefront = await getPublicStorefrontBySlug("demo-brand")

    expect(storefront).toMatchObject({
      tenant: {
        slug: "demo-brand",
        name: "Demo Brand",
      },
      activeBranch: {
        id: "demo-branch-centro",
        name: "Centro",
      },
      etaMinutes: 18,
    })
    expect(storefront?.menu).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Classic Burger",
          category: "Burgers",
          modifierGroups: expect.arrayContaining([
            expect.objectContaining({
              modifierKind: "choice",
              options: expect.arrayContaining([
                expect.objectContaining({ name: "Mayonesa de ajo", defaultSelected: true }),
                expect.objectContaining({ name: "Picante", defaultSelected: false }),
              ]),
            }),
          ]),
        }),
        expect.objectContaining({ name: "Papas crujientes", category: "Acompanantes" }),
      ])
    )
  })

  it("keeps returning null for non-demo slugs when Supabase is unavailable", async () => {
    createSupabaseAdminClient.mockReturnValue(null)

    await expect(getPublicStorefrontBySlug("fire-burger")).resolves.toBeNull()
  })
})
