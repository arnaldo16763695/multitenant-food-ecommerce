import { NextResponse } from "next/server"

import { requireAdminAccess } from "@/lib/auth/admin"
import type { CatalogProductMutationInput } from "@/lib/domain/catalog"
import { getCatalogModuleFromSupabase, createCatalogProduct } from "@/lib/services/catalog"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type ProductsRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export async function GET(_request: Request, context: ProductsRouteContext) {
  const { tenantSlug } = await context.params
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 })
  }

  const moduleData = await getCatalogModuleFromSupabase(supabase, access.membership.tenantId)

  return NextResponse.json(moduleData)
}

export async function POST(request: Request, context: ProductsRouteContext) {
  const { tenantSlug } = await context.params
  const access = await requireAdminAccess(tenantSlug)
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 })
  }

  const payload = (await request.json()) as CatalogProductMutationInput
  const result = await createCatalogProduct(supabase, access.membership.tenantId, payload)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
