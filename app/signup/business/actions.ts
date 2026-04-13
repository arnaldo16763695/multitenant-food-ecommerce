"use server"

import { revalidatePath } from "next/cache"

import { createBusinessSignup } from "@/lib/services/platform"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type CreateBusinessSignupPayload = {
  readonly companyName: string
  readonly ownerFullName: string
  readonly ownerEmail: string
  readonly ownerPhone: string
  readonly slugRequested: string
  readonly businessType: string
  readonly branchCountEstimate: string
  readonly notes: string
}

function parseBranchCountEstimate(value: string) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null
  }

  return Math.round(numericValue)
}

export async function createBusinessSignupAction(payload: CreateBusinessSignupPayload) {
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    throw new Error("Supabase admin client is not configured.")
  }

  const result = await createBusinessSignup(adminClient, {
    companyName: payload.companyName,
    ownerFullName: payload.ownerFullName,
    ownerEmail: payload.ownerEmail,
    ownerPhone: payload.ownerPhone,
    slugRequested: payload.slugRequested,
    businessType: payload.businessType,
    branchCountEstimate: parseBranchCountEstimate(payload.branchCountEstimate),
    notes: payload.notes,
  })

  if (result.ok) {
    revalidatePath("/platform/signups")
  }

  return result
}
