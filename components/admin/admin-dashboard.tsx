import { ArrowRight, Clock3, MapPinned, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { adminMetrics, adminTasks, recentOrders } from "@/lib/config/admin"

type AdminDashboardProps = {
  readonly tenantSlug: string
}

function getOrderBadgeVariant(status: (typeof recentOrders)[number]["status"]) {
  if (status === "Listo") return "success"
  if (status === "En cocina") return "secondary"

  return "warning"
}

export function AdminDashboard({ tenantSlug }: AdminDashboardProps) {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
        <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,_rgba(28,25,23,1)_0%,_rgba(41,37,36,1)_50%,_rgba(120,53,15,0.88)_100%)] text-white shadow-[0_24px_70px_rgba(28,25,23,0.24)]">
          <CardHeader className="pb-3">
            <Badge variant="warning" className="w-fit border-white/10 bg-white/10 text-orange-200">
              {tenantSlug}
            </Badge>
            <CardTitle className="mt-4 max-w-2xl text-3xl leading-tight sm:text-4xl">
              Centro operativo para marcas, sucursales y decisiones del dia.
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-7 text-stone-300">
              El dashboard ya deja ver el tipo de superficie que queremos: sobria, clara y orientada a operacion real.
              El siguiente paso aqui es cambiar datos estaticos por consultas tenant-aware y estados accionables.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3.5">
              <MapPinned className="mb-3 size-5 text-orange-300" />
              <p className="text-sm font-semibold">Priorizacion por sucursal</p>
              <p className="mt-2 text-sm leading-6 text-stone-300">La base del admin ya conversa con la idea de nearest branch first.</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3.5">
              <Clock3 className="mb-3 size-5 text-orange-300" />
              <p className="text-sm font-semibold">Operacion de cocina</p>
              <p className="mt-2 text-sm leading-6 text-stone-300">Separamos admin y kitchen desde el inicio para no mezclar responsabilidades.</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-3.5">
              <ShieldCheck className="mb-3 size-5 text-orange-300" />
              <p className="text-sm font-semibold">Tenant-aware</p>
              <p className="mt-2 text-sm leading-6 text-stone-300">La siguiente iteracion debe enchufar roles, branch scope y permisos reales.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Foco del sprint</CardTitle>
            <CardDescription>Incremento pequeno, util y coherente con la Fase 1.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {adminTasks.map((task) => (
              <div key={task.title} className="rounded-[1rem] border border-border bg-secondary/40 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">{task.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{task.detail}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 tracking-[0.14em] normal-case">
                    {task.owner}
                  </Badge>
                </div>
              </div>
            ))}
            <Button variant="outline" className="h-8 w-full justify-between rounded-lg px-3 text-sm">
              Ver backlog operativo
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={metric.status}>{metric.hint}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card id="orders">
          <CardHeader className="pb-3">
            <CardTitle>Pedidos recientes</CardTitle>
            <CardDescription>Vista rapida para caja, supervison y seguimiento antes de entrar al modulo completo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[1rem] border border-border">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-secondary/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-xs font-medium">Pedido</th>
                    <th className="px-3 py-2.5 text-xs font-medium">Cliente</th>
                    <th className="px-3 py-2.5 text-xs font-medium">Sucursal</th>
                    <th className="px-3 py-2.5 text-xs font-medium">Estado</th>
                    <th className="px-3 py-2.5 text-xs font-medium">ETA</th>
                    <th className="px-3 py-2.5 text-xs font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-t border-border bg-card">
                      <td className="px-3 py-2.5 font-semibold text-card-foreground">{order.id}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{order.customer}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{order.branch}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={getOrderBadgeVariant(order.status)}>{order.status}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{order.eta}</td>
                      <td className="px-3 py-2.5 font-medium text-card-foreground">{order.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card id="catalog">
            <CardHeader className="pb-3">
              <CardTitle>Catalogo</CardTitle>
              <CardDescription>El admin ya tiene un lugar claro para los modulos que siguen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[1rem] bg-secondary/40 p-3.5">
                <p className="text-sm font-semibold text-card-foreground">Productos y categorias</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">CRUD del menu base por tenant.</p>
              </div>
              <div className="rounded-[1rem] bg-secondary/40 p-3.5">
                <p className="text-sm font-semibold text-card-foreground">Modificadores</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Extras, salsas, combos y reglas por producto.</p>
              </div>
              <div className="rounded-[1rem] bg-secondary/40 p-3.5">
                <p className="text-sm font-semibold text-card-foreground">Overrides por sucursal</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Disponibilidad, precio y tiempos por branch.</p>
              </div>
            </CardContent>
          </Card>

          <Card id="settings">
            <CardHeader className="pb-3">
              <CardTitle>Configuracion siguiente</CardTitle>
              <CardDescription>La base visual ya permite crecer sin rehacer el admin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm leading-6 text-muted-foreground">
              <p>Conectar tenant y branch reales desde Supabase.</p>
              <p>Agregar formularios con `shadcn/ui` para sucursales, horarios y roles.</p>
              <p>Introducir filtros y tablas reales sin romper la estructura actual.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
