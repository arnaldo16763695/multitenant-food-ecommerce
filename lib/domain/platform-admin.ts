export type PlatformRole = "platform_owner" | "platform_admin"

export type BusinessSignupStatus = "pending" | "approved" | "rejected" | "provisioned"

export type BusinessSignupDecision = "approved" | "rejected"

export type BusinessSignupProvisionDelivery = "resend" | "console"

export type PlatformTenantSummary = {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly storefrontEnabled: boolean
  readonly activeBranchCount: number
  readonly activeMembershipCount: number
}

export type PlatformMobileHomeBannerSummary = {
  readonly id: string
  readonly tenantId: string
  readonly tenantName: string
  readonly tenantSlug: string
  readonly branchId: string | null
  readonly branchName: string | null
  readonly title: string
  readonly subtitle: string
  readonly imageUrl: string | null
  readonly ctaLabel: string
  readonly sortOrder: number
  readonly isActive: boolean
  readonly startsAt: string | null
  readonly endsAt: string | null
}

export type PlatformMobileHomeBannerOption = {
  readonly tenantId: string
  readonly tenantName: string
  readonly tenantSlug: string
  readonly branches: readonly {
    readonly id: string
    readonly name: string
  }[]
}

export type SavePlatformMobileHomeBannerInput = {
  readonly bannerId?: string
  readonly tenantId: string
  readonly branchId?: string | null
  readonly title: string
  readonly subtitle: string
  readonly imageUrl?: string | null
  readonly ctaLabel: string
  readonly sortOrder: number
  readonly isActive: boolean
  readonly startsAt?: string | null
  readonly endsAt?: string | null
}

export type BusinessSignupSummary = {
  readonly id: string
  readonly companyName: string
  readonly ownerFullName: string
  readonly ownerEmail: string
  readonly ownerPhone: string | null
  readonly slugRequested: string
  readonly businessType: string | null
  readonly branchCountEstimate: number | null
  readonly status: BusinessSignupStatus
  readonly createdAt: string
  readonly reviewedAt: string | null
  readonly provisionedTenantId: string | null
  readonly provisionedTenantSlug: string | null
}

export type CreateBusinessSignupInput = {
  readonly companyName: string
  readonly ownerFullName: string
  readonly ownerEmail: string
  readonly ownerPhone: string
  readonly slugRequested: string
  readonly businessType: string
  readonly branchCountEstimate: number | null
  readonly notes?: string
}

export type UpdateBusinessSignupDecisionInput = {
  readonly signupId: string
  readonly decision: BusinessSignupDecision
  readonly reviewedByProfileId: string
}

export type ProvisionBusinessSignupInput = {
  readonly signupId: string
  readonly provisionedByProfileId: string
}

export type ProvisionBusinessSignupResult = {
  readonly ok: boolean
  readonly tenantId?: string
  readonly tenantSlug?: string
  readonly invitationUrl?: string
  readonly delivery?: BusinessSignupProvisionDelivery
  readonly error?: string
}

export type RegenerateBusinessSignupAccessResult = {
  readonly ok: boolean
  readonly tenantSlug?: string
  readonly invitationUrl?: string
  readonly error?: string
}
