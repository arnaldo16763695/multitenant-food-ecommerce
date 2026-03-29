import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const branches = [
  { name: "Centro", status: "Activa", coverage: "2.5 km", prepTime: "16 min" },
  { name: "Norte", status: "Pausada", coverage: "3.2 km", prepTime: "21 min" },
  { name: "Este", status: "Activa", coverage: "1.8 km", prepTime: "18 min" },
] as const

export default function AdminBranchesPage() {
  return (
    <AdminPageShell
      eyebrow="Sucursales"
      title="Operacion por branch"
      description="Este modulo prepara el terreno para horarios, cobertura, disponibilidad y asignacion operativa por sucursal, que es uno de los ejes reales del producto."
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {branches.map((branch) => (
          <Card key={branch.name}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{branch.name}</CardTitle>
                <Badge variant={branch.status === "Activa" ? "success" : "warning"}>{branch.status}</Badge>
              </div>
              <CardDescription>Base para branch settings y reglas de fulfillment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>Cobertura sugerida: {branch.coverage}</p>
              <p>Prep time base: {branch.prepTime}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </AdminPageShell>
  )
}
