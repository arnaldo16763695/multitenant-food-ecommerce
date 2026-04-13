import { ClipboardList } from "lucide-react"

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

  return (
    <section className="grid gap-6">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {signups.map((signup) => (
                <TableRow key={signup.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{signup.companyName}</p>
                      <p className="text-xs text-muted-foreground">{signup.businessType ?? "Sin tipo declarado"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p>{signup.ownerFullName}</p>
                      <p className="text-xs text-muted-foreground">{signup.ownerEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>{signup.slugRequested}</TableCell>
                  <TableCell>
                    <Badge variant={getSignupBadgeVariant(signup.status)}>{signup.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(signup.createdAt).toLocaleDateString("es-VE")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}
