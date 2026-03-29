import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="Configuracion"
      title="Preferencias y governance del tenant"
      description="Aqui deberian vivir branding del admin, ajustes del negocio, permisos, integraciones y reglas operativas globales del tenant."
    >
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
