import Link from "next/link"
import { Building2, Store } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPlatformTenants } from "@/lib/services/platform"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function PlatformTenantsPage() {
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const tenants = await getPlatformTenants(supabase)
  const storefrontEnabledCount = tenants.filter((tenant) => tenant.storefrontEnabled).length

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tenants</CardDescription>
            <CardTitle className="text-3xl">{tenants.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Empresas registradas en la plataforma.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Storefronts activos</CardDescription>
            <CardTitle className="text-3xl">{storefrontEnabledCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tenants visibles en el directorio publico.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sucursales activas</CardDescription>
            <CardTitle className="text-3xl">{tenants.reduce((total, tenant) => total + tenant.activeBranchCount, 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Total operativo actual entre todos los tenants.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="inline-flex items-center gap-2">
              <Building2 className="size-5 text-orange-700" />
              Tenants del SaaS
            </CardTitle>
            <Link className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-950" href="/platform/audit?entity=platform_tenant">
              Ver auditoria de tenants
            </Link>
          </div>
          <CardDescription>Vista global de las empresas registradas y su estado operativo base.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Storefront</TableHead>
                <TableHead>Sucursales activas</TableHead>
                <TableHead>Staff activo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.storefrontEnabled ? "success" : "warning"}>
                      {tenant.storefrontEnabled ? "Publicado" : "Oculto"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-sm text-foreground">
                      <Store className="size-4 text-orange-700" />
                      {tenant.activeBranchCount}
                    </span>
                  </TableCell>
                  <TableCell>{tenant.activeMembershipCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}
