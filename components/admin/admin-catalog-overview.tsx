import { ArrowRight, Layers3, SlidersHorizontal } from "lucide-react"
import Link from "next/link"

import { catalogCategories, catalogModifierGroups, catalogProducts } from "@/lib/config/admin-catalog"

import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AdminCatalogOverviewProps = {
  readonly tenantSlug: string
}

export function AdminCatalogOverview({ tenantSlug }: AdminCatalogOverviewProps) {
  const baseCatalogPath = `/app/${tenantSlug}/admin/catalog`

  return (
    <AdminPageShell
      eyebrow="Catalogo"
      title="Centro del menu por tenant"
      description="El catalogo ahora funciona como modulo contenedor. Desde aqui entras a productos, categorias y modificadores con una estructura mas clara y escalable para CRUD reales."
      badge="Modulo organizado por entidades"
    >
      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
            <CardDescription>CRUD principal del menu y overrides por sucursal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.25rem] bg-secondary/40 p-4 text-sm text-muted-foreground">
              {catalogProducts.length} productos base listos para evolucionar a datos reales.
            </div>
            <Button asChild className="w-full justify-between rounded-xl">
              <Link href={`${baseCatalogPath}/products`}>
                Abrir productos
                <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorias</CardTitle>
            <CardDescription>Orden, visibilidad y agrupacion del storefront.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.25rem] bg-secondary/40 p-4 text-sm text-muted-foreground">
              {catalogCategories.length} categorias listas para orden y control de visibilidad.
            </div>
            <Button asChild variant="outline" className="w-full justify-between rounded-xl">
              <Link href={`${baseCatalogPath}/categories`}>
                Abrir categorias
                <Layers3 />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modificadores</CardTitle>
            <CardDescription>Grupos de seleccion para extras, salsas y variantes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.25rem] bg-secondary/40 p-4 text-sm text-muted-foreground">
              {catalogModifierGroups.length} grupos preparados para reglas min/max y asignacion por producto.
            </div>
            <Button asChild variant="outline" className="w-full justify-between rounded-xl">
              <Link href={`${baseCatalogPath}/modifiers`}>
                Abrir modificadores
                <SlidersHorizontal />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Estado actual</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            La base visual ya no mezcla todas las entidades del menu en una sola pantalla. Ahora el siguiente paso sano
            es convertir cada submodulo en un CRUD real conectado a Supabase.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Prioridad recomendada</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            Empezar por `Productos`, luego `Categorias`, y despues `Modificadores`. Ese orden coincide mejor con el valor
            operativo del admin.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Siguiente integracion</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            Tipos de dominio, consultas tenant-aware y formularios de alta/edicion con validacion consistente.
          </CardContent>
        </Card>
      </section>
    </AdminPageShell>
  )
}
