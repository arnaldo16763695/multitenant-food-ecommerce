export type CatalogMediaEntityType = "category" | "product" | "tenant-hero"

type UploadCatalogMediaInput = {
  readonly tenantSlug: string
  readonly entityType: CatalogMediaEntityType
  readonly file: File
  readonly entityId?: string
  readonly previousPath?: string
}

type UploadCatalogMediaResult =
  | {
      readonly ok: true
      readonly entityId: string
      readonly path: string
      readonly publicUrl: string | null
    }
  | {
      readonly ok: false
      readonly error: string
    }

export async function uploadCatalogMedia({
  tenantSlug,
  entityType,
  file,
  entityId,
  previousPath,
}: UploadCatalogMediaInput): Promise<UploadCatalogMediaResult> {
  const formData = new FormData()
  formData.set("file", file)
  formData.set("entityType", entityType)

  if (entityId) {
    formData.set("entityId", entityId)
  }

  if (previousPath) {
    formData.set("previousPath", previousPath)
  }

  const response = await fetch(`/api/admin/${tenantSlug}/catalog/media`, {
    method: "POST",
    body: formData,
  })

  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean
        entityId?: string
        path?: string
        publicUrl?: string | null
        error?: string
      }
    | null

  if (!response.ok || !payload?.ok || !payload.entityId || !payload.path) {
    return {
      ok: false,
      error: payload?.error ?? "No pudimos subir la imagen.",
    }
  }

  return {
    ok: true,
    entityId: payload.entityId,
    path: payload.path,
    publicUrl: payload.publicUrl ?? null,
  }
}
