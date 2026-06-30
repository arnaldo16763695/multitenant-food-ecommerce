"use client"

import * as React from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { createModifierGroupAction, updateModifierGroupAction } from "@/app/app/[tenantSlug]/admin/catalog/modifiers/actions"
import { type CatalogModifierGroup } from "@/lib/config/admin-catalog"

import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type ModifierOptionFormValue = {
  readonly id: string
  readonly name: string
  readonly priceDelta: string
  readonly sortOrder: number
}

type ModifierGroupFormValue = {
  readonly id: string
  readonly name: string
  readonly type: CatalogModifierGroup["type"]
  readonly minSelect: number
  readonly maxSelect: number
  readonly options: readonly ModifierOptionFormValue[]
}

type ModifierDialogMode = "create" | "edit"

type AdminCatalogModifiersProps = {
  readonly tenantSlug: string
  readonly initialModifierGroups?: readonly CatalogModifierGroup[]
}

function buildModifierGroupFormValues(group: CatalogModifierGroup): ModifierGroupFormValue {
  return {
    id: group.id,
    name: group.name,
    type: group.type,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    options: group.options.map((option, index) => ({
      id: option.id,
      name: option.name,
      priceDelta: option.priceDelta,
      sortOrder: index,
    })),
  }
}

function buildEmptyModifierGroup(index: number): ModifierGroupFormValue {
  return {
    id: `draft-modifier-group-${index + 1}`,
    name: "",
    type: "Multiple",
    minSelect: 0,
    maxSelect: 1,
    options: [
      {
        id: `draft-modifier-option-${index + 1}-1`,
        name: "",
        priceDelta: "$ 0.00",
        sortOrder: 0,
      },
    ],
  }
}

export function AdminCatalogModifiers({ tenantSlug, initialModifierGroups = [] }: AdminCatalogModifiersProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<ModifierDialogMode>("create")
  const [formErrorMessage, setFormErrorMessage] = React.useState("")
  const [isSaving, startSaving] = React.useTransition()
  const [groupFormValues, setGroupFormValues] = React.useState<ModifierGroupFormValue>(() => buildEmptyModifierGroup(initialModifierGroups.length))
  const [initialGroupFormValues, setInitialGroupFormValues] = React.useState<ModifierGroupFormValue>(() => buildEmptyModifierGroup(initialModifierGroups.length))

  const filteredModifierGroups = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return initialModifierGroups
    }

    return initialModifierGroups.filter((group) => {
      return [group.name, group.type, group.appliedTo, ...group.options.map((option) => option.name)].join(" ").toLowerCase().includes(normalizedQuery)
    })
  }, [initialModifierGroups, searchQuery])

  const hasUnsavedChanges = React.useMemo(() => JSON.stringify(groupFormValues) !== JSON.stringify(initialGroupFormValues), [groupFormValues, initialGroupFormValues])

  function openCreateDialog() {
    const emptyGroup = buildEmptyModifierGroup(initialModifierGroups.length)
    setDialogMode("create")
    setInitialGroupFormValues(emptyGroup)
    setGroupFormValues(emptyGroup)
    setFormErrorMessage("")
    setIsDialogOpen(true)
  }

  function openEditDialog(group: CatalogModifierGroup) {
    const nextValues = buildModifierGroupFormValues(group)
    setDialogMode("edit")
    setInitialGroupFormValues(nextValues)
    setGroupFormValues(nextValues)
    setFormErrorMessage("")
    setIsDialogOpen(true)
  }

  function handleFieldChange(field: keyof Omit<ModifierGroupFormValue, "id" | "options">, value: string | number) {
    setFormErrorMessage("")
    setGroupFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  function handleOptionChange(index: number, field: keyof Omit<ModifierOptionFormValue, "id" | "sortOrder">, value: string) {
    setFormErrorMessage("")
    setGroupFormValues((currentValues) => ({
      ...currentValues,
      options: currentValues.options.map((option, currentIndex) => (currentIndex === index ? { ...option, [field]: value } : option)),
    }))
  }

  function addOptionRow() {
    setGroupFormValues((currentValues) => ({
      ...currentValues,
      options: [
        ...currentValues.options,
        {
          id: `draft-modifier-option-${currentValues.options.length + 1}`,
          name: "",
          priceDelta: "$ 0.00",
          sortOrder: currentValues.options.length,
        },
      ],
    }))
  }

  function removeOptionRow(index: number) {
    setGroupFormValues((currentValues) => ({
      ...currentValues,
      options: currentValues.options.filter((_, currentIndex) => currentIndex !== index).map((option, currentIndex) => ({ ...option, sortOrder: currentIndex })),
    }))
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && hasUnsavedChanges) {
      setGroupFormValues(initialGroupFormValues)
    }

    setIsDialogOpen(nextOpen)
  }

  function saveModifierGroup() {
    if (!groupFormValues.name.trim()) {
      setFormErrorMessage("Completa el nombre del grupo de modificadores.")
      return
    }

    if (groupFormValues.maxSelect < groupFormValues.minSelect) {
      setFormErrorMessage("El maximo no puede ser menor al minimo.")
      return
    }

    if (!groupFormValues.options.some((option) => option.name.trim())) {
      setFormErrorMessage("Agrega al menos una opcion valida.")
      return
    }

    startSaving(async () => {
      const formData = new FormData()
      formData.set("name", groupFormValues.name)
      formData.set("type", groupFormValues.type)
      formData.set("minSelect", String(groupFormValues.minSelect))
      formData.set("maxSelect", String(groupFormValues.maxSelect))
      formData.set(
        "options",
        JSON.stringify(
          groupFormValues.options.map((option) => ({
            id: option.id.startsWith("draft-") ? undefined : option.id,
            name: option.name,
            priceDelta: option.priceDelta,
            sortOrder: option.sortOrder,
          }))
        )
      )

      const result =
        dialogMode === "create"
          ? await createModifierGroupAction(tenantSlug, formData)
          : await updateModifierGroupAction(groupFormValues.id, tenantSlug, formData)

      if (!result.ok) {
        setFormErrorMessage(result.error ?? "No pudimos guardar el modificador.")
        return
      }

      setIsDialogOpen(false)
      router.refresh()
    })
  }

  return (
    <AdminPageShell
      eyebrow="Catalogo / Modificadores"
      title="Grupos de modificadores"
      description="Gestiona reglas de seleccion y opciones disponibles para el storefront configurable."
      badge={`${filteredModifierGroups.length} grupos`}
      density="compact"
    >
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle>Listado de grupos</CardTitle>
            <CardDescription>Configura min/max y las opciones que luego se muestran en el product sheet del storefront.</CardDescription>
            <div className="relative mt-3 max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-8 pl-9" placeholder="Buscar grupo u opcion" />
            </div>
          </div>
          <Button className="h-8 rounded-lg px-3 text-sm" onClick={openCreateDialog}>
            <Plus />
            Nuevo modificador
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-[1rem] border border-border">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="h-10 px-3 text-xs">Grupo</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Tipo</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Regla</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Opciones</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Aplicacion</TableHead>
                  <TableHead className="h-10 px-3 text-right text-xs">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModifierGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="px-3 py-2 font-semibold text-card-foreground">{group.name}</TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge variant="outline">{group.type}</Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">
                      {group.minSelect} / {group.maxSelect}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">{group.optionCount} opciones</TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">{group.appliedTo}</TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => openEditDialog(group)}>
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredModifierGroups.length === 0 ? (
            <div className="mt-4 rounded-[1rem] border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
              {initialModifierGroups.length === 0 ? "Este tenant aun no tiene grupos de modificadores. Crea el primero cuando quieras configurar extras o variantes." : "No encontramos grupos de modificadores con ese filtro."}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-[min(92vw,760px)]">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Nuevo grupo de modificadores" : `Editar ${initialGroupFormValues.name}`}</DialogTitle>
            <DialogDescription>Gestiona nombre, regla de seleccion y opciones disponibles para el storefront.</DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[calc(88vh-11rem)] gap-3 overflow-y-auto px-6 pb-2">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Nombre</span>
                <Input value={groupFormValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} placeholder="Ej. Salsas" />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Tipo</span>
                <select value={groupFormValues.type} onChange={(event) => handleFieldChange("type", event.target.value as ModifierGroupFormValue["type"])} className="h-8 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                  <option value="Single">Single</option>
                  <option value="Multiple">Multiple</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Minimo</span>
                <Input type="number" value={String(groupFormValues.minSelect)} onChange={(event) => handleFieldChange("minSelect", Number(event.target.value) || 0)} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Maximo</span>
                <Input type="number" value={String(groupFormValues.maxSelect)} onChange={(event) => handleFieldChange("maxSelect", Number(event.target.value) || 0)} />
              </label>
            </div>

            <div className="rounded-[1rem] border border-border p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Opciones</p>
                  <p className="mt-1 text-xs text-muted-foreground">Cada opcion puede tener un delta de precio propio.</p>
                </div>
                <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-sm" onClick={addOptionRow}>
                  <Plus />
                  Agregar opcion
                </Button>
              </div>

              <div className="mt-3 grid gap-2.5">
                {groupFormValues.options.map((option, index) => (
                  <div key={option.id} className="grid gap-2.5 rounded-[0.9rem] border border-border bg-secondary/20 p-3 md:grid-cols-[1.3fr_1fr_auto] md:items-end">
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-card-foreground">Nombre</span>
                      <Input value={option.name} onChange={(event) => handleOptionChange(index, "name", event.target.value)} placeholder="Ej. BBQ" />
                    </label>
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-card-foreground">Delta precio</span>
                      <Input value={option.priceDelta} onChange={(event) => handleOptionChange(index, "priceDelta", event.target.value)} placeholder="Ej. $ 0.50" />
                    </label>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeOptionRow(index)} disabled={groupFormValues.options.length === 1}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {formErrorMessage ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formErrorMessage}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-8 rounded-lg px-3 text-sm" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cerrar
            </Button>
            <Button className="h-8 rounded-lg px-3 text-sm" onClick={saveModifierGroup} disabled={isSaving}>
              {dialogMode === "create" ? "Crear modificador" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
