import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { AdminStorefrontSettings } from "@/components/admin/admin-storefront-settings"
import { requireAdminSectionAccess } from "@/lib/auth/admin-section"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type AdminSettingsPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminSettingsPage({ params }: AdminSettingsPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminSectionAccess(tenantSlug, "settings")
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const tenantResult = await supabase
    .from("tenants")
    .select("name, storefront_enabled, hero_image_url")
    .eq("id", access.membership.tenantId)
    .limit(1)
    .maybeSingle<{
      name: string
      storefront_enabled: boolean
      hero_image_url: string | null
    }>()

  if (tenantResult.error || !tenantResult.data) {
    throw new Error(tenantResult.error?.message ?? "No pudimos cargar la configuracion del tenant.")
  }

  return (
    <AdminPageShell
      eyebrow="Configuracion"
      title="Preferencias y governance del tenant"
      description="Aqui deberian vivir branding del admin, ajustes del negocio, permisos, integraciones y reglas operativas globales del tenant."
    >
      <AdminStorefrontSettings
        tenantSlug={tenantSlug}
        tenantName={tenantResult.data.name}
        initialStorefrontEnabled={tenantResult.data.storefront_enabled}
        initialHeroImageUrl={tenantResult.data.hero_image_url}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuracion del negocio</CardTitle>
            <CardDescription>Ajustes globales antes de entrar a sucursales especificas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Zona horaria, moneda y reglas base.</p>
            <p>Preparacion para feature flags y limites del plan SaaS.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Roles e integraciones</CardTitle>
            <CardDescription>Base para seguridad y extensiones posteriores.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Usuarios internos y permisos por tenant o branch.</p>
            <p>Canales de notificacion, pagos y conectores futuros.</p>
          </CardContent>
        </Card>
      </section>
    </AdminPageShell>
  )
}
