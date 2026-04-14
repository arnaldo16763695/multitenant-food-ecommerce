import { getAppUrl } from "@/lib/auth/app-url"

export function getAdminAppUrl() {
  return getAppUrl()
}

export function buildAdminAuthCallbackUrl(nextPath: string) {
  return `${getAppUrl()}/auth/admin/callback?next=${encodeURIComponent(nextPath)}`
}

export function buildAdminSetupPasswordUrl(nextPath: string) {
  return `${getAppUrl()}/auth/admin/setup-password?next=${encodeURIComponent(nextPath)}`
}

export function buildAdminResetPasswordUrl(nextPath: string) {
  return `${getAppUrl()}/auth/admin/reset-password?next=${encodeURIComponent(nextPath)}`
}
