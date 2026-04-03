const CATALOG_MEDIA_BUCKET = "catalog-media"

export function getCatalogMediaBucket() {
  return CATALOG_MEDIA_BUCKET
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
