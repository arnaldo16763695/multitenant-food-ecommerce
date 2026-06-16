export function resolveCustomerNextPath(tenantSlug: string, nextPath?: string) {
  const fallbackPath = `/app/${tenantSlug}/account`

  if (!nextPath?.startsWith(`/app/${tenantSlug}`) || nextPath.startsWith("//")) {
    return fallbackPath
  }

  return nextPath
}
