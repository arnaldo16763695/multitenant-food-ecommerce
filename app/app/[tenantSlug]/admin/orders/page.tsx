import { recentOrders } from "@/lib/config/admin"

import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function getOrderBadgeVariant(status: (typeof recentOrders)[number]["status"]) {
  if (status === "Listo") return "success"
  if (status === "En cocina") return "secondary"

  return "warning"
}

export default function AdminOrdersPage() {
  return (
    <AdminPageShell
      eyebrow="Pedidos"
      title="Seguimiento operativo por sucursal"
      description="La ruta de pedidos ya queda aislada para incorporar filtros, estados, incidencias y flujo de supervision sin seguir cargando el overview."
    >
      <Card>
        <CardHeader>
          <CardTitle>Cola reciente</CardTitle>
          <CardDescription>Snapshot del flujo operativo mientras conectamos datos reales.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-[1.25rem] border border-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Sucursal</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">ETA</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-border bg-card">
                    <td className="px-4 py-4 font-semibold text-card-foreground">{order.id}</td>
                    <td className="px-4 py-4 text-muted-foreground">{order.customer}</td>
                    <td className="px-4 py-4 text-muted-foreground">{order.branch}</td>
                    <td className="px-4 py-4">
                      <Badge variant={getOrderBadgeVariant(order.status)}>{order.status}</Badge>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{order.eta}</td>
                    <td className="px-4 py-4 font-medium text-card-foreground">{order.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
