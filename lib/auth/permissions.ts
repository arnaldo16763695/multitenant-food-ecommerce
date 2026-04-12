export type TenantRole = "owner" | "manager" | "branch_manager" | "cashier" | "preparer"

export type AdminSection =
  | "overview"
  | "catalog"
  | "orders"
  | "branches"
  | "staff"
  | "settings"
  | "kitchen"

const ROLE_SECTION_ACCESS: Record<TenantRole, readonly AdminSection[]> = {
  owner: ["overview", "catalog", "orders", "branches", "staff", "settings", "kitchen"],
  manager: ["overview", "catalog", "orders", "branches", "staff", "settings", "kitchen"],
  branch_manager: ["overview", "orders", "branches", "staff", "kitchen"],
  cashier: ["overview", "orders"],
  preparer: ["kitchen"],
}

export function isTenantRole(value: string): value is TenantRole {
  return value in ROLE_SECTION_ACCESS
}

export function canAccessAdminSection(role: string, section: AdminSection) {
  if (!isTenantRole(role)) {
    return false
  }

  return ROLE_SECTION_ACCESS[role].includes(section)
}

export function getAccessibleAdminSections(role: string): readonly AdminSection[] {
  if (!isTenantRole(role)) {
    return []
  }

  return ROLE_SECTION_ACCESS[role]
}

export function getDefaultAdminSection(role: string): AdminSection {
  if (canAccessAdminSection(role, "overview")) {
    return "overview"
  }

  if (canAccessAdminSection(role, "orders")) {
    return "orders"
  }

  return "kitchen"
}

export function getDefaultRouteForRole(tenantSlug: string, role: string) {
  if (canAccessAdminSection(role, "overview")) {
    return `/app/${tenantSlug}/admin/overview`
  }

  if (canAccessAdminSection(role, "orders")) {
    return `/app/${tenantSlug}/admin/orders`
  }

  return `/app/${tenantSlug}/kitchen`
}
