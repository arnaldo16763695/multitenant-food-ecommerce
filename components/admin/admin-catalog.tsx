"use client"

import * as React from "react"
import Image from "next/image"
import { MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"

import { catalogCategories, catalogProducts, type CatalogCategory, type CatalogProduct } from "@/lib/config/admin-catalog"
import {
  createProductWithImageAction,
  duplicateProductAction,
  toggleProductStatusAction,
  updateProductWithImageAction,
} from "@/app/app/[tenantSlug]/admin/catalog/products/actions"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type ProductStatus = CatalogProduct["status"]

type ProductFormValues = {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly description: string
  readonly basePrice: string
  readonly status: ProductStatus
  readonly primaryImagePath: string
  readonly primaryImageAlt: string
}

type ProductDialogMode = "create" | "edit"

const DEFAULT_PRODUCT_STATUS: ProductStatus = "Draft"

function buildFormValues(product: CatalogProduct): ProductFormValues {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    basePrice: product.basePrice,
    status: product.status,
    primaryImagePath: product.primaryImageUrl ?? "",
    primaryImageAlt: product.name,
  }
}

function buildEmptyProduct(index: number): ProductFormValues {
  return {
    id: `draft-product-${index + 1}`,
    name: "",
    category: "",
    description: "",
    basePrice: "",
    status: DEFAULT_PRODUCT_STATUS,
    primaryImagePath: "",
    primaryImageAlt: "",
  }
}

function getProductStatusVariant(status: ProductStatus) {
  return status === "Activo" ? "success" : "outline"
}

function formatBranchSummary(product: CatalogProduct) {
  const availableBranches = product.branchStatuses.filter((branch) => branch.availability === "Disponible").length

  return `${availableBranches}/${product.branchStatuses.length} activas`
}

type AdminCatalogProductsProps = {
  readonly tenantSlug: string
  readonly initialProducts?: readonly CatalogProduct[]
  readonly initialCategories?: readonly CatalogCategory[]
}

export function AdminCatalogProducts({ tenantSlug, initialProducts = catalogProducts, initialCategories = catalogCategories }: AdminCatalogProductsProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("Todos")
  const [isProductDialogOpen, setIsProductDialogOpen] = React.useState(false)
  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = React.useState(false)
  const [productDialogMode, setProductDialogMode] = React.useState<ProductDialogMode>("create")
  const [formErrorMessage, setFormErrorMessage] = React.useState("")
  const [selectedPrimaryImageFile, setSelectedPrimaryImageFile] = React.useState<File | null>(null)
  const [primaryImagePreviewUrl, setPrimaryImagePreviewUrl] = React.useState<string | null>(null)
  const [isSavingProduct, startSavingProduct] = React.useTransition()
  const [isRunningRowAction, startRowAction] = React.useTransition()
  const [productFormValues, setProductFormValues] = React.useState<ProductFormValues>(() => buildEmptyProduct(initialProducts.length))
  const [initialProductFormValues, setInitialProductFormValues] = React.useState<ProductFormValues>(() => buildEmptyProduct(initialProducts.length))

  const products = initialProducts

  const categoryFilters = React.useMemo(() => {
    return ["Todos", ...new Set(initialCategories.map((category) => category.name))].filter(Boolean)
  }, [initialCategories])

  const categoryOptions = React.useMemo(() => initialCategories.map((category) => category.name), [initialCategories])

  const filteredProducts = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return products.filter((product) => {
      const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory

      if (!matchesCategory) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return [product.name, product.description, product.category, ...product.tags, ...product.modifierGroups]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [products, searchQuery, selectedCategory])

  const hasUnsavedChanges = React.useMemo(() => {
    return JSON.stringify(productFormValues) !== JSON.stringify(initialProductFormValues)
  }, [initialProductFormValues, productFormValues])

  function openCreateDialog() {
    const emptyProduct = buildEmptyProduct(products.length)
    setProductDialogMode("create")
    setInitialProductFormValues(emptyProduct)
    setProductFormValues(emptyProduct)
    setFormErrorMessage("")
    setSelectedPrimaryImageFile(null)
    setPrimaryImagePreviewUrl(null)
    setIsProductDialogOpen(true)
  }

  function openEditDialog(product: CatalogProduct) {
    const nextValues = buildFormValues(product)
    setProductDialogMode("edit")
    setInitialProductFormValues(nextValues)
    setProductFormValues(nextValues)
    setFormErrorMessage("")
    setSelectedPrimaryImageFile(null)
    setPrimaryImagePreviewUrl(product.primaryImageUrl ?? null)
    setIsProductDialogOpen(true)
  }

  function runWithRefresh(action: () => Promise<{ ok: boolean; error?: string }>, onSuccess?: () => void) {
    startRowAction(async () => {
      const result = await action()

      if (!result.ok) {
        setFormErrorMessage(result.error ?? "No pudimos completar la accion.")
        return
      }

      onSuccess?.()
      router.refresh()
    })
  }

  function handleProductDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && hasUnsavedChanges) {
      setIsUnsavedDialogOpen(true)
      return
    }

    setIsProductDialogOpen(nextOpen)
  }

  function closeProductDialog() {
    setIsProductDialogOpen(false)
    setIsUnsavedDialogOpen(false)
    setSelectedPrimaryImageFile(null)
    setPrimaryImagePreviewUrl(null)
  }

  function handleFieldChange(field: keyof ProductFormValues, value: string) {
    setFormErrorMessage("")
    setProductFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  function saveProduct() {
    if (!productFormValues.name.trim() || !productFormValues.category.trim() || !productFormValues.basePrice.trim()) {
      setFormErrorMessage("Completa nombre, categoria y precio base valido.")
      return
    }

    startSavingProduct(async () => {
      const formData = new FormData()
      formData.set("name", productFormValues.name)
      formData.set("category", productFormValues.category)
      formData.set("description", productFormValues.description)
      formData.set("basePrice", productFormValues.basePrice)
      formData.set("status", productFormValues.status)
      formData.set("primaryImagePath", productFormValues.primaryImagePath)
      formData.set("primaryImageAlt", productFormValues.primaryImageAlt)
      formData.set("previousPrimaryImagePath", initialProductFormValues.primaryImagePath)

      if (selectedPrimaryImageFile) {
        formData.set("primaryImageFile", selectedPrimaryImageFile)
      }

      const result = productDialogMode === "create" ? await createProductWithImageAction(tenantSlug, formData) : await updateProductWithImageAction(productFormValues.id, tenantSlug, formData)

      if (!result.ok) {
        setFormErrorMessage(result.error ?? "No pudimos guardar el producto.")
        return
      }

      closeProductDialog()
      router.refresh()
    })
  }

  function saveAndCloseUnsavedDialog() {
    saveProduct()
  }

  function discardChanges() {
    setProductFormValues(initialProductFormValues)
    closeProductDialog()
  }

  function handlePrimaryImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null

    setSelectedPrimaryImageFile(file)

    if (!file) {
      setPrimaryImagePreviewUrl(getCatalogMediaPublicUrl(productFormValues.primaryImagePath) ?? null)
      return
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    setPrimaryImagePreviewUrl(nextPreviewUrl)
  }

  return (
    <AdminPageShell
      eyebrow="Catalogo / Productos"
      title="Productos del menu"
      description="Vista principal compacta para operar el CRUD de productos, revisar estado, precio base y overrides por sucursal sin perder densidad util."
      badge={`${filteredProducts.length} productos visibles`}
      density="compact"
    >
      <section>
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-sm font-semibold text-card-foreground">Toolbar operativa</p>
                <span className="text-xs text-muted-foreground">Vista compacta para gestion diaria</span>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-9 pl-9"
                  placeholder="Buscar productos, categorias o tags"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Button variant="outline" className="h-9 rounded-xl">
                <SlidersHorizontal />
                Filtros
              </Button>
              <Button className="h-9 rounded-xl" onClick={openCreateDialog}>
                <Plus />
                Nuevo producto
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 xl:max-w-[28rem] xl:justify-end">
              {categoryFilters.map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="h-8 rounded-full"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
            <CardDescription>Vista principal compacta tipo CRUD para escaneo y acciones rapidas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[1.5rem] border border-border">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Imagen</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Modificadores</TableHead>
                    <TableHead>Branches</TableHead>
                    <TableHead className="w-[80px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold text-card-foreground">{product.name}</p>
                          <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">{product.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted p-1">
                          {product.primaryImageUrl ? <Image alt={product.name} className="h-full w-full object-contain" height={56} src={product.primaryImageUrl} unoptimized width={56} /> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getProductStatusVariant(product.status)}>{product.status}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-card-foreground">{product.basePrice}</TableCell>
                      <TableCell className="text-muted-foreground">{product.modifierGroups.length} grupos</TableCell>
                      <TableCell className="text-muted-foreground">{formatBranchSummary(product)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal />
                                <span className="sr-only">Open product actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl">
                              <DropdownMenuItem onSelect={() => openEditDialog(product)}>Editar producto</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => runWithRefresh(() => duplicateProductAction(product.id, tenantSlug))}>Duplicar</DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  openEditDialog(product)
                                }}
                              >
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => runWithRefresh(() => toggleProductStatusAction(product.id, tenantSlug, product.status))}>
                                {product.status === "Activo" ? "Pausar" : "Activar"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="mt-4 rounded-[1.5rem] border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                No encontramos productos con ese filtro. Ajusta la busqueda o la categoria.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Dialog open={isProductDialogOpen} onOpenChange={handleProductDialogOpenChange}>
        <DialogContent className="w-[min(92vw,760px)]">
          <DialogHeader>
            <DialogTitle>{productDialogMode === "create" ? "Nuevo producto" : `Editar ${initialProductFormValues.name}`}</DialogTitle>
            <DialogDescription>Modal compacto para alta o edicion del producto sin salir de la tabla principal.</DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[calc(88vh-11rem)] gap-4 overflow-y-auto px-6 pb-2">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Nombre</span>
                <Input value={productFormValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} placeholder="Ej. Fire Smash Burger" />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Categoria</span>
                <select
                  value={productFormValues.category}
                  onChange={(event) => handleFieldChange("category", event.target.value)}
                  className="h-9 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Selecciona una categoria</option>
                  {categoryOptions.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Descripcion</span>
              <textarea
                value={productFormValues.description}
                onChange={(event) => handleFieldChange("description", event.target.value)}
                className="min-h-28 rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Describe el producto para el equipo y el storefront."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Precio base</span>
                <Input value={productFormValues.basePrice} onChange={(event) => handleFieldChange("basePrice", event.target.value)} placeholder="Ej. $ 11.90" />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Estado</span>
                <select
                  value={productFormValues.status}
                  onChange={(event) => handleFieldChange("status", event.target.value as ProductStatus)}
                  className="h-9 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="Activo">Activo</option>
                  <option value="Draft">Draft</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Primary image path</span>
                <Input
                  value={productFormValues.primaryImagePath}
                  onChange={(event) => handleFieldChange("primaryImagePath", event.target.value)}
                  placeholder="tenants/tenant-id/products/product-id/primary/cover.jpg"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Image alt text</span>
                <Input
                  value={productFormValues.primaryImageAlt}
                  onChange={(event) => handleFieldChange("primaryImageAlt", event.target.value)}
                  placeholder="Describe la imagen principal"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Subir imagen principal</span>
              <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePrimaryImageFileChange} />
            </label>

            <div className="rounded-[1.25rem] border border-dashed border-border p-4">
              <p className="text-sm font-medium text-card-foreground">Preview</p>
              <div className="mt-3 flex aspect-[16/9] max-h-48 items-center justify-center overflow-hidden rounded-[1rem] border border-border bg-muted p-3">
                {primaryImagePreviewUrl ? (
                  <Image
                    alt={productFormValues.primaryImageAlt || productFormValues.name || "Product preview"}
                    className="h-full w-full object-contain"
                    height={360}
                    src={primaryImagePreviewUrl}
                    unoptimized
                    width={640}
                  />
                ) : null}
              </div>
            </div>

            {formErrorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formErrorMessage}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleProductDialogOpenChange(false)} disabled={isSavingProduct}>
              Cerrar
            </Button>
            <Button onClick={saveProduct} disabled={isSavingProduct || isRunningRowAction}>
              {productDialogMode === "create" ? "Crear producto" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUnsavedDialogOpen} onOpenChange={setIsUnsavedDialogOpen}>
        <DialogContent className="w-[min(92vw,480px)]" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cambios sin guardar</DialogTitle>
            <DialogDescription>Detectamos cambios en el formulario. Si cierras ahora, puedes perderlos. Elige como quieres continuar.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnsavedDialogOpen(false)} disabled={isSavingProduct}>
              Seguir editando
            </Button>
            <Button variant="destructive" onClick={discardChanges} disabled={isSavingProduct}>
              Cerrar sin guardar
            </Button>
            <Button onClick={saveAndCloseUnsavedDialog} disabled={isSavingProduct}>
              Guardar y cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
