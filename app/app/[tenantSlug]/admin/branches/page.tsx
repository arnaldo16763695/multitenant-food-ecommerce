import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { AdminBranchStorefrontSettings } from "@/components/admin/admin-branch-storefront-settings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAdminSectionAccess } from "@/lib/auth/admin-section"
import { getActiveBranchesForMembership, getStaffBranches } from "@/lib/services/staff"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function getPublicAppUrl() {
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

type AdminBranchesPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminBranchesPage({ params }: AdminBranchesPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminSectionAccess(tenantSlug, "branches")
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const branches =
    access.membership.role === "branch_manager"
      ? await getActiveBranchesForMembership(supabase, access.membership.id)
      : await getStaffBranches(supabase, access.membership.tenantId)

  const publicAppUrl = getPublicAppUrl()
  const activeBranchCount = branches.filter((branch) => branch.isActive).length
  const inactiveBranchCount = branches.length - activeBranchCount

  return (
    <AdminPageShell
      eyebrow="Sucursales"
      title="Storefronts por sucursal"
      description="Desde aqui puedes abrir y compartir el link publico de cada sucursal. Cada URL entra al storefront del tenant con la sucursal ya seleccionada para que el cliente vea disponibilidad y precio reales por branch."
      badge={`${branches.length} sucursales visibles`}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sucursales activas</CardDescription>
            <CardTitle className="text-2xl">{activeBranchCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Son las que pueden recibir trafico publico en storefront.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sucursales inactivas</CardDescription>
            <CardTitle className="text-2xl">{inactiveBranchCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Conservan su configuracion, pero no deberian usarse para campanas ni QR.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Base publica</CardDescription>
            <CardTitle className="break-all text-base">{publicAppUrl}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Esta base se usa para construir el link publico de cada sucursal.
          </CardContent>
        </Card>
      </section>

      <AdminBranchStorefrontSettings tenantSlug={tenantSlug} publicAppUrl={publicAppUrl} branches={branches} />
    </AdminPageShell>
  )
}
