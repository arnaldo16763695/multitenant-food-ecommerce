import { ClipboardList } from "lucide-react"

import { PlatformSignupRowActions } from "@/components/platform/platform-signup-row-actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getBusinessSignups } from "@/lib/services/platform"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function getSignupBadgeVariant(status: string) {
  if (status === "approved" || status === "provisioned") return "success" as const
  if (status === "rejected") return "outline" as const
  return "warning" as const
}

export default async function PlatformSignupsPage() {
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const signups = await getBusinessSignups(supabase)
  const pendingCount = signups.filter((signup) => signup.status === "pending").length
  const approvedCount = signups.filter((signup) => signup.status === "approved").length
  const rejectedCount = signups.filter((signup) => signup.status === "rejected").length

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-3xl">{pendingCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Solicitudes esperando decision comercial.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Aprobadas</CardDescription>
            <CardTitle className="text-3xl">{approvedCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Negocios listos para pasar al provisioning.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Rechazadas</CardDescription>
            <CardTitle className="text-3xl">{rejectedCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Solicitudes descartadas o fuera de alcance.</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <ClipboardList className="size-5 text-orange-700" />
            Solicitudes de negocio
          </CardTitle>
          <CardDescription>
            Entrada comercial para nuevos tenants. Desde aqui luego puedes conectar el provisioning automatico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signups.map((signup) => (
                <TableRow key={signup.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{signup.companyName}</p>
                      <p className="text-xs text-muted-foreground">{signup.businessType ?? "Sin tipo declarado"}</p>
                      <p className="text-xs text-muted-foreground">
                        {signup.branchCountEstimate ? `${signup.branchCountEstimate} sucursales estimadas` : "Sin estimacion de sucursales"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p>{signup.ownerFullName}</p>
                      <p className="text-xs text-muted-foreground">{signup.ownerEmail}</p>
                      {signup.ownerPhone ? <p className="text-xs text-muted-foreground">{signup.ownerPhone}</p> : null}
                    </div>
                  </TableCell>
                  <TableCell>{signup.slugRequested}</TableCell>
                  <TableCell>
                    <Badge variant={getSignupBadgeVariant(signup.status)}>{signup.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p>{new Date(signup.createdAt).toLocaleDateString("es-VE")}</p>
                      {signup.reviewedAt ? (
                        <p className="text-xs text-muted-foreground">Revisada {new Date(signup.reviewedAt).toLocaleDateString("es-VE")}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <PlatformSignupRowActions
                      signupId={signup.id}
                      status={signup.status}
                      provisionedTenantId={signup.provisionedTenantId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}
