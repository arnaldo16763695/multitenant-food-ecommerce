import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import { provisionBusinessSignup } from "@/lib/services/platform"

type SignupRow = {
  id: string
  company_name: string
  owner_full_name: string
  owner_email: string
  slug_requested: string
  status: "pending" | "approved" | "rejected" | "provisioned"
  provisioned_tenant_id: string | null
}

type ExistingProfileRow = {
  id: string
  auth_user_id: string
  email: string
  full_name: string | null
} | null

// Stands in for exactly the calls provisionBusinessSignup makes up through (and including) the
// profiles upsert -- the boundary this test cares about. Nothing past that point (tenant/branch/
// membership inserts, the confirmation email) is exercised here.
function createProvisionSignupStub(options: {
  signupRow: SignupRow | null
  existingTenantRow: { id: string } | null
  existingProfileRow: ExistingProfileRow
  profileUpsertResult: { data: { id: string } | null; error: { message: string } | null }
}) {
  const businessSignupsChain = {
    select: () => businessSignupsChain,
    eq: () => businessSignupsChain,
    limit: () => businessSignupsChain,
    maybeSingle: async () => ({ data: options.signupRow, error: null }),
  }

  const tenantsChain = {
    select: () => tenantsChain,
    eq: () => tenantsChain,
    limit: () => tenantsChain,
    maybeSingle: async () => ({ data: options.existingTenantRow, error: null }),
  }

  const profilesSelectChain = {
    select: () => profilesSelectChain,
    ilike: () => profilesSelectChain,
    limit: () => profilesSelectChain,
    maybeSingle: async () => ({ data: options.existingProfileRow, error: null }),
  }

  const profilesUpsertChain = {
    select: () => profilesUpsertChain,
    single: async () => options.profileUpsertResult,
  }

  // The "profiles" table is queried twice for two different purposes: first the existing-profile
  // lookup (select/ilike/maybeSingle), then the upsert (upsert/select/single). Call order is
  // fixed by provisionBusinessSignup's own logic, so count-based dispatch is safe here.
  let profilesCallCount = 0

  const createUser = vi.fn(async () => ({ data: { user: { id: "new-auth-user-id" } }, error: null }))
  const generateLink = vi.fn(async () => ({ data: { properties: { action_link: "https://example.com/link" } }, error: null }))
  const deleteUser = vi.fn(async () => ({ data: {}, error: null }))

  const client = {
    from: (table: string) => {
      if (table === "business_signups") return businessSignupsChain
      if (table === "tenants") return tenantsChain

      if (table === "profiles") {
        profilesCallCount += 1
        return profilesCallCount === 1 ? profilesSelectChain : { upsert: () => profilesUpsertChain }
      }

      throw new Error(`createProvisionSignupStub: unexpected table "${table}"`)
    },
    auth: {
      admin: { createUser, generateLink, deleteUser },
    },
  }

  return { client: client as unknown as SupabaseClient, createUser, generateLink, deleteUser }
}

function createApprovedSignupRow(overrides: Partial<SignupRow> = {}): SignupRow {
  return {
    id: "signup-1",
    company_name: "Acme Foods",
    owner_full_name: "Owner One",
    owner_email: "owner@acme.com",
    slug_requested: "acme",
    status: "approved",
    provisioned_tenant_id: null,
    ...overrides,
  }
}

describe("provisionBusinessSignup", () => {
  it("deletes the newly created auth user when the profile upsert fails for a brand-new owner", async () => {
    const { client, createUser, deleteUser } = createProvisionSignupStub({
      signupRow: createApprovedSignupRow(),
      existingTenantRow: null,
      existingProfileRow: null,
      profileUpsertResult: { data: null, error: { message: "duplicate key value" } },
    })

    const result = await provisionBusinessSignup(client, { signupId: "signup-1", provisionedByProfileId: "reviewer-1" })

    expect(createUser).toHaveBeenCalledTimes(1)
    // Without this cleanup, retrying provisioning would call createUser again with the same
    // email and fail permanently on a duplicate-email error -- this is the bug being guarded.
    expect(deleteUser).toHaveBeenCalledWith("new-auth-user-id")
    expect(result).toEqual({ ok: false, error: "duplicate key value" })
  })

  it("does not delete the auth user when reusing an existing profile, even if the upsert fails", async () => {
    const { client, createUser, generateLink, deleteUser } = createProvisionSignupStub({
      signupRow: createApprovedSignupRow(),
      existingTenantRow: null,
      existingProfileRow: { id: "profile-existing", auth_user_id: "existing-auth-user-id", email: "owner@acme.com", full_name: "Owner One" },
      profileUpsertResult: { data: null, error: { message: "duplicate key value" } },
    })

    const result = await provisionBusinessSignup(client, { signupId: "signup-1", provisionedByProfileId: "reviewer-1" })

    expect(createUser).not.toHaveBeenCalled()
    expect(generateLink).toHaveBeenCalledTimes(1)
    expect(deleteUser).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: "duplicate key value" })
  })

  it("rejects a signup that is not approved before touching any Supabase Auth call", async () => {
    const { client, createUser, generateLink, deleteUser } = createProvisionSignupStub({
      signupRow: createApprovedSignupRow({ status: "pending" }),
      existingTenantRow: null,
      existingProfileRow: null,
      profileUpsertResult: { data: { id: "profile-new" }, error: null },
    })

    const result = await provisionBusinessSignup(client, { signupId: "signup-1", provisionedByProfileId: "reviewer-1" })

    expect(createUser).not.toHaveBeenCalled()
    expect(generateLink).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: "Solo las solicitudes aprobadas pueden provisionarse." })
  })
})
