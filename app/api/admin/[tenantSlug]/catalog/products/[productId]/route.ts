import { NextResponse } from "next/server"

import { requireAdminAccess } from "@/lib/auth/admin"
import type { CatalogProductMutationInput, CatalogProductStatus } from "@/lib/domain/catalog"
import { duplicateCatalogProduct, toggleCatalogProductStatus, updateCatalogProduct } from "@/lib/services/catalog"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type ProductRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
    productId: string
  }>
}

export async function PATCH(request: Request, context: ProductRouteContext) {
  const { tenantSlug, productId } = await context.params
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 })
  }

  const body = (await request.json()) as
    | ({ action: "toggle-status"; currentStatus: CatalogProductStatus })
    | ({ action?: "update" } & CatalogProductMutationInput)

  const result =
    body.action === "toggle-status"
      ? await toggleCatalogProductStatus(supabase, access.membership.tenantId, productId, body.currentStatus)
      : await updateCatalogProduct(supabase, access.membership.tenantId, productId, body)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function POST(request: Request, context: ProductRouteContext) {
  const { tenantSlug, productId } = await context.params
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 })
  }

  const body = (await request.json()) as { action: "duplicate" }

  if (body.action !== "duplicate") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 })
  }

  const result = await duplicateCatalogProduct(supabase, access.membership.tenantId, productId)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
