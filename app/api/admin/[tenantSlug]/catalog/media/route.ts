import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { requireAdminAccess } from "@/lib/auth/admin"
import { canManageCatalogMaster } from "@/lib/auth/permissions"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  buildBranchHeroImagePath,
  buildCategoryImagePath,
  buildProductPrimaryImagePath,
  buildTenantHeroImagePath,
  getCatalogMediaBucket,
  getCatalogMediaPublicUrl,
  getFileExtension,
} from "@/lib/supabase/storage"

type CatalogMediaRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

type CatalogMediaEntityType = "category" | "product" | "tenant-hero" | "branch-hero"

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function isCatalogMediaEntityType(value: string): value is CatalogMediaEntityType {
  return value === "category" || value === "product" || value === "tenant-hero" || value === "branch-hero"
}

function buildCatalogMediaPath(tenantId: string, entityType: CatalogMediaEntityType, entityId: string, fileName: string) {
  if (entityType === "category") {
    return buildCategoryImagePath(tenantId, entityId, fileName)
  }

  if (entityType === "tenant-hero") {
    return buildTenantHeroImagePath(tenantId, fileName)
  }

  if (entityType === "branch-hero") {
    return buildBranchHeroImagePath(tenantId, entityId, fileName)
  }

  return buildProductPrimaryImagePath(tenantId, entityId, fileName)
}

export async function POST(request: Request, context: CatalogMediaRouteContext) {
  const { tenantSlug } = await context.params
  const access = await requireAdminAccess(tenantSlug)

  if (!canManageCatalogMaster(access.membership.role)) {
    return NextResponse.json({ error: "Solo owner y manager pueden subir media del catalogo." }, { status: 403 })
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  const entityType = String(formData.get("entityType") ?? "")
  const previousPath = String(formData.get("previousPath") ?? "").trim()

  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Selecciona una imagen valida para continuar." }, { status: 400 })
  }

  if (!isCatalogMediaEntityType(entityType)) {
    return NextResponse.json({ error: "El tipo de media solicitado no es valido." }, { status: 400 })
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Solo se permiten imagenes JPG, PNG o WEBP." }, { status: 400 })
  }

  const entityId = String(formData.get("entityId") ?? "").trim() || randomUUID()
  const fileExtension = getFileExtension(file.name)
  const nextPath = buildCatalogMediaPath(access.membership.tenantId, entityType, entityId, `cover.${fileExtension}`)
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const uploadResult = await adminClient.storage.from(getCatalogMediaBucket()).upload(nextPath, fileBuffer, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  })

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  if (previousPath && previousPath !== nextPath) {
    await adminClient.storage.from(getCatalogMediaBucket()).remove([previousPath])
  }

  return NextResponse.json({
    ok: true,
    entityId,
    path: nextPath,
    publicUrl: getCatalogMediaPublicUrl(nextPath),
  })
}
