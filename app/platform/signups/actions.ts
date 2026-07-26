"use server"

import { revalidatePath } from "next/cache"

import { requirePlatformAccess } from "@/lib/auth/platform"
import { buildAuditActor } from "@/lib/services/audit"
import {
  provisionBusinessSignup,
  regenerateBusinessSignupAccess,
  updateBusinessSignupDecision,
} from "@/lib/services/platform"
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
    auditActor: buildAuditActor({
      surface: "platform",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    }),
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
    auditActor: buildAuditActor({
      surface: "platform",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    }),
  })

  if (result.ok) {
    revalidatePath("/platform/signups")
    revalidatePath("/platform/tenants")
  }

  return result
}

export async function regenerateBusinessSignupAccessAction(signupId: string) {
  const access = await requirePlatformAccess("/platform/signups")
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  return regenerateBusinessSignupAccess(
    adminClient,
    signupId,
    buildAuditActor({
      surface: "platform",
      profileId: access.profile.id,
      membershipId: access.membership.id,
      name: access.profile.fullName,
      role: access.membership.role,
    })
  )
}
