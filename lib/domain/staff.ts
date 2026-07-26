export const STAFF_ROLES = ["owner", "manager", "branch_manager", "cashier", "preparer"] as const
export const MANAGEABLE_STAFF_ROLES = ["branch_manager", "cashier", "preparer"] as const

export type StaffRole = (typeof STAFF_ROLES)[number]
export type ManageableStaffRole = (typeof MANAGEABLE_STAFF_ROLES)[number]

export type AdminStaffBranchAssignment = {
  readonly membershipId: string
  readonly branchId: string
  readonly branchName: string
  readonly isActive: boolean
  readonly role: StaffRole
}

export type AdminStaffMember = {
  readonly membershipId: string
  readonly profileId: string
  readonly fullName: string
  readonly email: string
  readonly role: StaffRole
  readonly isActive: boolean
  readonly branches: readonly AdminStaffBranchAssignment[]
}

export type StaffBranchOption = {
  readonly id: string
  readonly name: string
  readonly isActive: boolean
  readonly heroImageUrl: string | null
  readonly addressLine1: string | null
  readonly city: string | null
  readonly state: string | null
  readonly postalCode: string | null
  readonly countryCode: string | null
  readonly latitude: number | null
  readonly longitude: number | null
}

export type StaffMutationResult = {
  readonly ok: boolean
  readonly error?: string
  readonly delivery?: "resend" | "console" | "none"
}

export function formatStaffRole(role: StaffRole) {
  switch (role) {
    case "owner":
      return "Owner"
    case "manager":
      return "Manager"
    case "branch_manager":
      return "Encargado de sucursal"
    case "cashier":
      return "Caja"
    case "preparer":
      return "Preparador"
    default:
      return role
  }
}

export function isManageableStaffRole(role: StaffRole): role is ManageableStaffRole {
  return MANAGEABLE_STAFF_ROLES.includes(role as ManageableStaffRole)
}
