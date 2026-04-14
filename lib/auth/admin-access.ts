function getAppUrl() {
  const explicitAppUrl = process.env.APP_URL?.trim()
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  const vercelPreviewUrl = process.env.VERCEL_URL?.trim()

  if (explicitAppUrl) {
    return explicitAppUrl.replace(/\/$/, "")
  }

  if (vercelProductionUrl) {
    return `https://${vercelProductionUrl}`
  }

  if (vercelPreviewUrl) {
    return `https://${vercelPreviewUrl}`
  }

  return "http://localhost:3000"
}

export function getAdminAppUrl() {
  return getAppUrl()
}

export function buildAdminAuthCallbackUrl(nextPath: string) {
  return `${getAppUrl()}/auth/admin/callback?next=${encodeURIComponent(nextPath)}`
}

export function buildAdminSetupPasswordUrl(nextPath: string) {
  return `${getAppUrl()}/auth/admin/setup-password?next=${encodeURIComponent(nextPath)}`
}
