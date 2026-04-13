export type PlatformRole = "platform_owner" | "platform_admin"

export type BusinessSignupStatus = "pending" | "approved" | "rejected" | "provisioned"

export type PlatformTenantSummary = {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly storefrontEnabled: boolean
  readonly activeBranchCount: number
  readonly activeMembershipCount: number
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
  readonly provisionedTenantId: string | null
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
