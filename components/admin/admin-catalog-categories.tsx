"use client"

import * as React from "react"
import Image from "next/image"
import { MoreHorizontal, Plus, Search } from "lucide-react"
import { useRouter } from "next/navigation"

import { createCategoryWithImageAction, updateCategoryWithImageAction } from "@/app/app/[tenantSlug]/admin/catalog/categories/actions"
import { uploadCatalogMedia } from "@/lib/catalog/upload-client"
import { type CatalogCategory } from "@/lib/config/admin-catalog"
import { getCatalogMediaPublicUrl } from "@/lib/supabase/storage"

import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type CategoryVisibility = CatalogCategory["visibility"]

type CategoryFormValues = {
  readonly id: string
  readonly name: string
  readonly visibility: CategoryVisibility
  readonly sortOrder: number
  readonly imagePath: string
  readonly imageAlt: string
}

type CategoryDialogMode = "create" | "edit"

type AdminCatalogCategoriesProps = {
  readonly tenantSlug: string
  readonly initialCategories?: readonly CatalogCategory[]
}

function buildEmptyCategory(index: number): CategoryFormValues {
  return {
    id: `draft-category-${index + 1}`,
    name: "",
    visibility: "Publica",
    sortOrder: index + 1,
    imagePath: "",
    imageAlt: "",
  }
}

function buildCategoryFormValues(category: CatalogCategory, index: number): CategoryFormValues {
  return {
    id: category.id,
    name: category.name,
    visibility: category.visibility,
    sortOrder: category.sortOrder ?? index + 1,
    imagePath: category.imagePath ?? "",
    imageAlt: category.name,
  }
}

export function AdminCatalogCategories({ tenantSlug, initialCategories = [] }: AdminCatalogCategoriesProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false)
  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = React.useState(false)
  const [categoryDialogMode, setCategoryDialogMode] = React.useState<CategoryDialogMode>("create")
  const [formErrorMessage, setFormErrorMessage] = React.useState("")
  const [selectedImageFile, setSelectedImageFile] = React.useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null)
  const [isSavingCategory, startSavingCategory] = React.useTransition()
  const [categoryFormValues, setCategoryFormValues] = React.useState<CategoryFormValues>(() => buildEmptyCategory(initialCategories.length))
  const [initialCategoryFormValues, setInitialCategoryFormValues] = React.useState<CategoryFormValues>(() => buildEmptyCategory(initialCategories.length))

  const filteredCategories = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return initialCategories
    }

    return initialCategories.filter((category) => category.name.toLowerCase().includes(normalizedQuery))
  }, [initialCategories, searchQuery])

  const hasUnsavedChanges = React.useMemo(() => {
    return JSON.stringify(categoryFormValues) !== JSON.stringify(initialCategoryFormValues) || Boolean(selectedImageFile)
  }, [categoryFormValues, initialCategoryFormValues, selectedImageFile])

  function openCreateDialog() {
    const emptyCategory = buildEmptyCategory(initialCategories.length)
    setCategoryDialogMode("create")
    setInitialCategoryFormValues(emptyCategory)
    setCategoryFormValues(emptyCategory)
    setSelectedImageFile(null)
    setImagePreviewUrl(null)
    setFormErrorMessage("")
    setIsCategoryDialogOpen(true)
  }

  function openEditDialog(category: CatalogCategory, index: number) {
    const nextValues = buildCategoryFormValues(category, index)
    setCategoryDialogMode("edit")
    setInitialCategoryFormValues(nextValues)
    setCategoryFormValues(nextValues)
    setSelectedImageFile(null)
    setImagePreviewUrl(category.imageUrl ?? null)
    setFormErrorMessage("")
    setIsCategoryDialogOpen(true)
  }

  function handleCategoryDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && hasUnsavedChanges) {
      setIsUnsavedDialogOpen(true)
      return
    }

    setIsCategoryDialogOpen(nextOpen)
  }

  function closeCategoryDialog() {
    setIsCategoryDialogOpen(false)
    setIsUnsavedDialogOpen(false)
    setSelectedImageFile(null)
    setImagePreviewUrl(null)
  }

  function handleFieldChange(field: keyof CategoryFormValues, value: string | number) {
    setFormErrorMessage("")
    setCategoryFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  function handleImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setSelectedImageFile(file)

    if (!file) {
      setImagePreviewUrl(getCatalogMediaPublicUrl(categoryFormValues.imagePath) ?? null)
      return
    }

    setImagePreviewUrl(URL.createObjectURL(file))
  }

  function saveCategory() {
    if (!categoryFormValues.name.trim()) {
      setFormErrorMessage("Completa el nombre de la categoria.")
      return
    }

    startSavingCategory(async () => {
      const formData = new FormData()
      formData.set("name", categoryFormValues.name)
      formData.set("visibility", categoryFormValues.visibility)
      formData.set("sortOrder", String(categoryFormValues.sortOrder))
      formData.set("imagePath", categoryFormValues.imagePath)
      formData.set("imageAlt", categoryFormValues.imageAlt)

      if (selectedImageFile) {
        const uploadResult = await uploadCatalogMedia({
          tenantSlug,
          entityType: "category",
          file: selectedImageFile,
          entityId: categoryDialogMode === "edit" ? categoryFormValues.id : undefined,
          previousPath: initialCategoryFormValues.imagePath || undefined,
        })

        if (!uploadResult.ok) {
          setFormErrorMessage(uploadResult.error)
          return
        }

        formData.set("categoryId", uploadResult.entityId)
        formData.set("imagePath", uploadResult.path)
      }

      const result =
        categoryDialogMode === "create"
          ? await createCategoryWithImageAction(tenantSlug, formData)
          : await updateCategoryWithImageAction(categoryFormValues.id, tenantSlug, formData)

      if (!result.ok) {
        setFormErrorMessage(result.error ?? "No pudimos guardar la categoria.")
        return
      }

      closeCategoryDialog()
      router.refresh()
    })
  }

  function saveAndCloseUnsavedDialog() {
    saveCategory()
  }

  function discardChanges() {
    setCategoryFormValues(initialCategoryFormValues)
    closeCategoryDialog()
  }

  return (
    <AdminPageShell
      eyebrow="Catalogo / Categorias"
      title="Categorias del menu"
      description="CRUD compacto para ordenar la taxonomia del storefront y controlar visibilidad sin mezclar categorias con productos o modificadores."
      badge={`${filteredCategories.length} categorias`}
      density="compact"
    >
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle>Listado de categorias</CardTitle>
            <CardDescription>Vista compacta para orden, conteo, estado y media principal.</CardDescription>
            <div className="relative mt-3 max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-8 pl-9" placeholder="Buscar categoria" />
            </div>
          </div>
          <Button className="h-8 rounded-lg px-3 text-sm" onClick={openCreateDialog}>
            <Plus />
            Nueva categoria
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-[1rem] border border-border">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="h-10 px-3 text-xs">Categoria</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Imagen</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Productos</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Visibilidad</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Orden</TableHead>
                  <TableHead className="h-10 w-[72px] px-3 text-right text-xs">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category, index) => (
                  <TableRow key={category.id}>
                    <TableCell className="px-3 py-2 font-semibold text-card-foreground">{category.name}</TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted p-1">
                        {category.imageUrl ? <Image alt={category.name} className="h-full w-full object-contain" height={48} src={category.imageUrl} unoptimized width={48} /> : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">{category.itemCount}</TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge variant={category.visibility === "Publica" ? "success" : "outline"}>{category.visibility}</Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">#{category.sortOrder ?? index + 1}</TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal />
                              <span className="sr-only">Open category actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl">
                            <DropdownMenuItem onSelect={() => openEditDialog(category, index)}>Editar categoría</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredCategories.length === 0 ? (
            <div className="mt-4 rounded-[1rem] border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
              {initialCategories.length === 0
                ? "Este tenant aun no tiene categorias cargadas. Crea la primera para empezar a organizar el menu."
                : "No encontramos categorias con ese filtro."}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={isCategoryDialogOpen} onOpenChange={handleCategoryDialogOpenChange}>
        <DialogContent className="w-[min(92vw,720px)]">
          <DialogHeader>
            <DialogTitle>{categoryDialogMode === "create" ? "Nueva categoria" : `Editar ${initialCategoryFormValues.name}`}</DialogTitle>
            <DialogDescription>Configura nombre, visibilidad, orden e imagen principal de la categoria.</DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[calc(88vh-11rem)] gap-3 overflow-y-auto px-6 pb-2">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Nombre</span>
                <Input value={categoryFormValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} placeholder="Ej. Burgers" />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Visibilidad</span>
                <select
                  value={categoryFormValues.visibility}
                  onChange={(event) => handleFieldChange("visibility", event.target.value as CategoryVisibility)}
                  className="h-8 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="Publica">Publica</option>
                  <option value="Oculta">Oculta</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-[0.7fr_1.3fr]">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Orden</span>
                <Input type="number" value={String(categoryFormValues.sortOrder)} onChange={(event) => handleFieldChange("sortOrder", Number(event.target.value) || 0)} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Image alt text</span>
                <Input value={categoryFormValues.imageAlt} onChange={(event) => handleFieldChange("imageAlt", event.target.value)} placeholder="Describe la imagen de la categoria" />
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Image path</span>
              <Input value={categoryFormValues.imagePath} onChange={(event) => handleFieldChange("imagePath", event.target.value)} placeholder="tenants/tenant-id/categories/category-id/cover.jpg" />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Subir imagen principal</span>
              <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageFileChange} />
            </label>

            <div className="rounded-[1rem] border border-dashed border-border p-3.5">
              <p className="text-sm font-medium text-card-foreground">Preview</p>
              <div className="mt-3 flex aspect-[16/9] max-h-40 items-center justify-center overflow-hidden rounded-[0.9rem] border border-border bg-muted p-3">
                {imagePreviewUrl ? (
                  <Image
                    alt={categoryFormValues.imageAlt || categoryFormValues.name || "Category preview"}
                    className="h-full w-full object-contain"
                    height={320}
                    src={imagePreviewUrl}
                    unoptimized
                    width={640}
                  />
                ) : null}
              </div>
            </div>

            {formErrorMessage ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formErrorMessage}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-8 rounded-lg px-3 text-sm" onClick={() => handleCategoryDialogOpenChange(false)} disabled={isSavingCategory}>
              Cerrar
            </Button>
            <Button className="h-8 rounded-lg px-3 text-sm" onClick={saveCategory} disabled={isSavingCategory}>
              {categoryDialogMode === "create" ? "Crear categoria" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUnsavedDialogOpen} onOpenChange={setIsUnsavedDialogOpen}>
        <DialogContent className="w-[min(92vw,480px)]" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cambios sin guardar</DialogTitle>
            <DialogDescription>Detectamos cambios en la categoria. Si cierras ahora, puedes perderlos.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-8 rounded-lg px-3 text-sm" onClick={() => setIsUnsavedDialogOpen(false)} disabled={isSavingCategory}>
              Seguir editando
            </Button>
            <Button variant="destructive" className="h-8 rounded-lg px-3 text-sm" onClick={discardChanges} disabled={isSavingCategory}>
              Cerrar sin guardar
            </Button>
            <Button className="h-8 rounded-lg px-3 text-sm" onClick={saveAndCloseUnsavedDialog} disabled={isSavingCategory}>
              Guardar y cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
