export function getAppUrl() {
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
