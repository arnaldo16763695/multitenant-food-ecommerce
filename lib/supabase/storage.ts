const CATALOG_MEDIA_BUCKET = "catalog-media"
const PAYMENT_PROOFS_BUCKET = "payment-proofs"

export function getCatalogMediaBucket() {
  return CATALOG_MEDIA_BUCKET
}

export function getPaymentProofsBucket() {
  return PAYMENT_PROOFS_BUCKET
}

export function buildCategoryImagePath(tenantId: string, categoryId: string, fileName: string) {
  return `tenants/${tenantId}/categories/${categoryId}/${fileName}`
}

export function buildProductPrimaryImagePath(tenantId: string, productId: string, fileName: string) {
  return `tenants/${tenantId}/products/${productId}/primary/${fileName}`
}

export function buildProductGalleryImagePath(tenantId: string, productId: string, fileName: string) {
  return `tenants/${tenantId}/products/${productId}/gallery/${fileName}`
}

export function buildTenantHeroImagePath(tenantId: string, fileName: string) {
  return `tenants/${tenantId}/branding/hero/${fileName}`
}

export function buildTenantLogoImagePath(tenantId: string, fileName: string) {
  return `tenants/${tenantId}/branding/logo/${fileName}`
}

export function buildBranchHeroImagePath(tenantId: string, branchId: string, fileName: string) {
  return `tenants/${tenantId}/branches/${branchId}/hero/${fileName}`
}

export function buildPaymentProofImagePath(tenantId: string, orderId: string, fileName: string) {
  return `tenants/${tenantId}/orders/${orderId}/payment-proof/${fileName}`
}

export function getFileExtension(fileName: string) {
  const segments = fileName.split(".")
  const candidate = segments.at(-1)?.toLowerCase()

  return candidate && candidate.length <= 8 ? candidate : "jpg"
}

export function getCatalogMediaPublicUrl(path: string | null | undefined) {
  if (!path) {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) {
    return null
  }

  return `${supabaseUrl}/storage/v1/object/public/${CATALOG_MEDIA_BUCKET}/${path}`
}

export function getCatalogMediaPathFromUrl(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return null
  }

  if (normalizedValue.startsWith("tenants/")) {
    return normalizedValue
  }

  try {
    const parsedUrl = new URL(normalizedValue)
    const storagePrefix = `/storage/v1/object/public/${CATALOG_MEDIA_BUCKET}/`

    if (!parsedUrl.pathname.startsWith(storagePrefix)) {
      return null
    }

    return decodeURIComponent(parsedUrl.pathname.slice(storagePrefix.length))
  } catch {
    return null
  }
}
