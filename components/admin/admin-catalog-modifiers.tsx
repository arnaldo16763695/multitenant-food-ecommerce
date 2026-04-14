"use client"

import * as React from "react"
import { Plus, Search } from "lucide-react"

import { type CatalogModifierGroup } from "@/lib/config/admin-catalog"

import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type AdminCatalogModifiersProps = {
  readonly initialModifierGroups?: readonly CatalogModifierGroup[]
}

export function AdminCatalogModifiers({ initialModifierGroups = [] }: AdminCatalogModifiersProps) {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredModifierGroups = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return initialModifierGroups
    }

    return initialModifierGroups.filter((group) => {
      return [group.name, group.type, group.appliedTo].join(" ").toLowerCase().includes(normalizedQuery)
    })
  }, [initialModifierGroups, searchQuery])

  return (
    <AdminPageShell
      eyebrow="Catalogo / Modificadores"
      title="Grupos de modificadores"
      description="Vista orientada a CRUD para gestionar grupos de seleccion y su aplicacion sobre productos y combos."
      badge={`${filteredModifierGroups.length} grupos`}
      density="compact"
    >
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle>Listado de grupos</CardTitle>
            <CardDescription>Base para reglas min/max, tipos de seleccion y asignacion posterior a productos.</CardDescription>
            <div className="relative mt-4 max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9 pl-9"
                placeholder="Buscar modificador o tipo"
              />
            </div>
          </div>
          <Button className="rounded-xl">
            <Plus />
            Nuevo modificador
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-[1.5rem] border border-border">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Aplicacion</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModifierGroups.map((group) => (
                  <TableRow key={group.name}>
                    <TableCell className="font-semibold text-card-foreground">{group.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{group.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{group.appliedTo}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="success">Activo</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredModifierGroups.length === 0 ? (
            <div className="mt-4 rounded-[1.5rem] border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              {initialModifierGroups.length === 0
                ? "Este tenant aun no tiene grupos de modificadores. Crea el primero cuando quieras configurar extras o variantes."
                : "No encontramos grupos de modificadores con ese filtro."}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
