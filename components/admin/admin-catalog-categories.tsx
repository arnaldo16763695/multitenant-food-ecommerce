"use client"

import * as React from "react"
import { Plus, Search } from "lucide-react"

import { catalogCategories } from "@/lib/config/admin-catalog"

import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function AdminCatalogCategories() {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredCategories = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return catalogCategories
    }

    return catalogCategories.filter((category) => category.name.toLowerCase().includes(normalizedQuery))
  }, [searchQuery])

  return (
    <AdminPageShell
      eyebrow="Catalogo / Categorias"
      title="Categorias del menu"
      description="CRUD compacto para ordenar la taxonomia del storefront y controlar visibilidad sin mezclar categorias con productos o modificadores."
      badge={`${filteredCategories.length} categorias`}
      density="compact"
    >
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle>Listado de categorias</CardTitle>
            <CardDescription>Vista compacta para orden, conteo y estado de publicacion.</CardDescription>
            <div className="relative mt-4 max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9 pl-9"
                placeholder="Buscar categoria"
              />
            </div>
          </div>
          <Button className="rounded-xl">
            <Plus />
            Nueva categoria
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-[1.5rem] border border-border">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Visibilidad</TableHead>
                  <TableHead className="text-right">Orden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category, index) => (
                  <TableRow key={category.name}>
                    <TableCell className="font-semibold text-card-foreground">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">{category.itemCount}</TableCell>
                    <TableCell>
                      <Badge variant={category.visibility === "Publica" ? "success" : "outline"}>{category.visibility}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">#{index + 1}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredCategories.length === 0 ? (
            <div className="mt-4 rounded-[1.5rem] border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              No encontramos categorias con ese filtro.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
