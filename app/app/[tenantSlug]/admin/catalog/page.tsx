import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminCatalogPage() {
  return (
    <AdminPageShell
      eyebrow="Catalogo"
      title="Base del menu por tenant"
      description="Este modulo ya queda separado del overview para crecer con CRUD de categorias, productos, modificadores y overrides por sucursal sin mezclar navegacion con operacion general."
      badge="Primer modulo funcional"
    >
      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
            <CardDescription>Espacio inicial para la lista principal del menu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Crear productos base por tenant.</p>
            <p>Definir precios base, descripcion y estados activos.</p>
            <p>Preparar imagenes y variantes para siguiente iteracion.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Categorias</CardTitle>
            <CardDescription>Organizacion inicial para storefront y admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Orden visual del menu.</p>
            <p>Visibilidad por tenant.</p>
            <p>Base para promos y destacados.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Modificadores</CardTitle>
            <CardDescription>Extras, salsas, toppings y combinaciones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Grupos requeridos y opcionales.</p>
            <p>Reglas min/max por producto.</p>
            <p>Base lista para validacion server-side.</p>
          </CardContent>
        </Card>
      </section>
    </AdminPageShell>
  )
}
