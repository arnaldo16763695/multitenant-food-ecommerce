"use server"

import { revalidatePath } from "next/cache"

import { requirePlatformAccess } from "@/lib/auth/platform"
import { provisionBusinessSignup, updateBusinessSignupDecision } from "@/lib/services/platform"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

import type { BusinessSignupDecision } from "@/lib/domain/platform-admin"

export async function updateBusinessSignupDecisionAction(signupId: string, decision: BusinessSignupDecision) {
  const access = await requirePlatformAccess("/platform/signups")
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const result = await updateBusinessSignupDecision(adminClient, {
    signupId,
    decision,
    reviewedByProfileId: access.profile.id,
  })

  if (result.ok) {
    revalidatePath("/platform/signups")
  }

  return result
}

export async function provisionBusinessSignupAction(signupId: string) {
  const access = await requirePlatformAccess("/platform/signups")
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const result = await provisionBusinessSignup(adminClient, {
    signupId,
    provisionedByProfileId: access.profile.id,
  })

  if (result.ok) {
    revalidatePath("/platform/signups")
    revalidatePath("/platform/tenants")
  }

  return result
}
