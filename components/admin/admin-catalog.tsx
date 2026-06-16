"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { MoreHorizontal, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { type CatalogBranchOption, type CatalogCategory, type CatalogProduct } from "@/lib/config/admin-catalog"
import {
  createProductWithImageAction,
  duplicateProductAction,
  toggleProductStatusAction,
  updateProductWithImageAction,
} from "@/app/app/[tenantSlug]/admin/catalog/products/actions"
import { canManageCatalogMaster } from "@/lib/auth/permissions"
import { uploadCatalogMedia } from "@/lib/catalog/upload-client"
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
  readonly variants: readonly {
    id: string
    name: string
    basePrice: string
    isDefault: boolean
    sortOrder: number
  }[]
  readonly branchOverrides: readonly {
    branchId: string
    branchName: string
    availabilityStatus: "available" | "paused" | "out_of_stock"
    priceOverride: string
    prepTimeMinutes: string
  }[]
}

type ProductDialogMode = "create" | "edit"

const DEFAULT_PRODUCT_STATUS: ProductStatus = "Draft"

function buildFormValues(product: CatalogProduct, branches: readonly CatalogBranchOption[]): ProductFormValues {
  const branchOverridesMap = new Map(product.branchStatuses.map((branchStatus) => [branchStatus.branchId, branchStatus]))

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    basePrice: product.basePrice,
    status: product.status,
    primaryImagePath: product.primaryImagePath ?? "",
    primaryImageAlt: product.name,
    variants: product.variants.map((variant, index) => ({
      id: variant.id,
      name: variant.name,
      basePrice: variant.basePrice,
      isDefault: variant.isDefault,
      sortOrder: index,
    })),
    branchOverrides: branches.map((branch) => {
      const branchOverride = branchOverridesMap.get(branch.id)

      return {
        branchId: branch.id,
        branchName: branch.name,
        availabilityStatus: branchOverride?.availabilityStatus ?? "available",
        priceOverride: branchOverride?.priceOverride ?? "",
        prepTimeMinutes: branchOverride?.prepTimeMinutes ?? "",
      }
    }),
  }
}

function buildEmptyProduct(index: number, branches: readonly CatalogBranchOption[]): ProductFormValues {
  return {
    id: `draft-product-${index + 1}`,
    name: "",
    category: "",
    description: "",
    basePrice: "",
    status: DEFAULT_PRODUCT_STATUS,
    primaryImagePath: "",
    primaryImageAlt: "",
    variants: [],
    branchOverrides: branches.map((branch) => ({
      branchId: branch.id,
      branchName: branch.name,
      availabilityStatus: "available",
      priceOverride: "",
      prepTimeMinutes: "",
    })),
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
  readonly initialBranches?: readonly CatalogBranchOption[]
  readonly role: string
}

export function AdminCatalogProducts({
  tenantSlug,
  initialProducts = [],
  initialCategories = [],
  initialBranches = [],
  role,
}: AdminCatalogProductsProps) {
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
  const [productFormValues, setProductFormValues] = React.useState<ProductFormValues>(() => buildEmptyProduct(initialProducts.length, initialBranches))
  const [initialProductFormValues, setInitialProductFormValues] = React.useState<ProductFormValues>(() => buildEmptyProduct(initialProducts.length, initialBranches))

  const products = initialProducts
  const canEditGlobalCatalog = canManageCatalogMaster(role)
  const hasCategories = initialCategories.length > 0

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
    const emptyProduct = buildEmptyProduct(products.length, initialBranches)
    setProductDialogMode("create")
    setInitialProductFormValues(emptyProduct)
    setProductFormValues(emptyProduct)
    setFormErrorMessage("")
    setSelectedPrimaryImageFile(null)
    setPrimaryImagePreviewUrl(null)
    setIsProductDialogOpen(true)
  }

  function openEditDialog(product: CatalogProduct) {
    const nextValues = buildFormValues(product, initialBranches)
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

  function handleBranchOverrideChange(
    branchId: string,
    field: "availabilityStatus" | "priceOverride" | "prepTimeMinutes",
    value: string
  ) {
    setFormErrorMessage("")
    setProductFormValues((currentValues) => ({
      ...currentValues,
      branchOverrides: currentValues.branchOverrides.map((branchOverride) =>
        branchOverride.branchId === branchId ? { ...branchOverride, [field]: value } : branchOverride
      ),
    }))
  }

  function addVariantRow() {
    setFormErrorMessage("")
    setProductFormValues((currentValues) => ({
      ...currentValues,
      variants: [
        ...currentValues.variants,
        {
          id: `draft-variant-${currentValues.variants.length + 1}`,
          name: "",
          basePrice: currentValues.basePrice,
          isDefault: currentValues.variants.length === 0,
          sortOrder: currentValues.variants.length,
        },
      ],
    }))
  }

  function handleVariantChange(index: number, field: "name" | "basePrice", value: string) {
    setFormErrorMessage("")
    setProductFormValues((currentValues) => ({
      ...currentValues,
      variants: currentValues.variants.map((variant, currentIndex) => (currentIndex === index ? { ...variant, [field]: value } : variant)),
    }))
  }

  function handleDefaultVariantChange(index: number) {
    setFormErrorMessage("")
    setProductFormValues((currentValues) => ({
      ...currentValues,
      variants: currentValues.variants.map((variant, currentIndex) => ({
        ...variant,
        isDefault: currentIndex === index,
      })),
    }))
  }

  function removeVariantRow(index: number) {
    setFormErrorMessage("")
    setProductFormValues((currentValues) => {
      const nextVariants = currentValues.variants.filter((_, currentIndex) => currentIndex !== index).map((variant, currentIndex) => ({
        ...variant,
        isDefault: variant.isDefault,
        sortOrder: currentIndex,
      }))

      const hasDefaultVariant = nextVariants.some((variant) => variant.isDefault)

      return {
        ...currentValues,
        variants: nextVariants.map((variant, currentIndex) => ({
          ...variant,
          isDefault: hasDefaultVariant ? variant.isDefault : currentIndex === 0,
        })),
      }
    })
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
      formData.set(
        "variants",
        JSON.stringify(
          productFormValues.variants.map((variant) => ({
            id: variant.id.startsWith("draft-") ? undefined : variant.id,
            name: variant.name,
            basePrice: variant.basePrice,
            isDefault: variant.isDefault,
            sortOrder: variant.sortOrder,
          }))
        )
      )
      formData.set(
        "branchOverrides",
        JSON.stringify(
          productFormValues.branchOverrides.map((branchOverride) => ({
            branchId: branchOverride.branchId,
            availabilityStatus: branchOverride.availabilityStatus,
            priceOverride: branchOverride.priceOverride,
            prepTimeMinutes: branchOverride.prepTimeMinutes,
          }))
        )
      )

      if (selectedPrimaryImageFile) {
        const uploadResult = await uploadCatalogMedia({
          tenantSlug,
          entityType: "product",
          file: selectedPrimaryImageFile,
          entityId: productDialogMode === "edit" ? productFormValues.id : undefined,
          previousPath: initialProductFormValues.primaryImagePath || undefined,
        })

        if (!uploadResult.ok) {
          setFormErrorMessage(uploadResult.error)
          return
        }

        formData.set("productId", uploadResult.entityId)
        formData.set("primaryImagePath", uploadResult.path)
      }

      const result =
        productDialogMode === "create"
          ? await createProductWithImageAction(tenantSlug, formData)
          : await updateProductWithImageAction(productFormValues.id, tenantSlug, formData)

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
              {canEditGlobalCatalog ? (
                <Button className="h-9 rounded-xl" onClick={openCreateDialog} disabled={!hasCategories}>
                  <Plus />
                  Nuevo producto
                </Button>
              ) : null}
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
            <CardDescription>
              {canEditGlobalCatalog
                ? "Vista principal compacta tipo CRUD para escaneo y acciones rapidas."
                : "Vista operativa por sucursal. Puedes ajustar disponibilidad, precio local y prep time sin tocar el catalogo maestro."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canEditGlobalCatalog && !hasCategories ? (
              <div className="mb-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                Aun no puedes crear productos en este tenant porque no existen categorias.{" "}
                <Link className="font-semibold underline underline-offset-4" href={`/app/${tenantSlug}/admin/catalog/categories`}>
                  Crea la primera categoria aqui
                </Link>
                .
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[1.5rem] border border-border">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Imagen</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Tamanos</TableHead>
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
                      <TableCell className="text-muted-foreground">{product.hasVariants ? `${product.variants.length} tamanos` : "Base unica"}</TableCell>
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
                              <DropdownMenuItem onSelect={() => openEditDialog(product)}>
                                {canEditGlobalCatalog ? "Editar producto" : "Configurar sucursal"}
                              </DropdownMenuItem>
                              {canEditGlobalCatalog ? (
                                <>
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
                                </>
                              ) : null}
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
                {!hasCategories
                  ? "Este tenant aun no tiene categorias. Crea la primera categoria y luego podras registrar productos."
                  : products.length === 0
                  ? "Este tenant aun no tiene productos cargados. Crea el primero para empezar a operar el catalogo."
                  : "No encontramos productos con ese filtro. Ajusta la busqueda o la categoria."}
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
                <Input value={productFormValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} placeholder="Ej. Fire Smash Burger" disabled={!canEditGlobalCatalog} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Categoria</span>
                <select
                  value={productFormValues.category}
                  onChange={(event) => handleFieldChange("category", event.target.value)}
                  disabled={!canEditGlobalCatalog || !hasCategories}
                  className="h-9 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">{hasCategories ? "Selecciona una categoria" : "Primero crea una categoria"}</option>
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
                disabled={!canEditGlobalCatalog}
                className="min-h-28 rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Describe el producto para el equipo y el storefront."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Precio base</span>
                <Input value={productFormValues.basePrice} onChange={(event) => handleFieldChange("basePrice", event.target.value)} placeholder="Ej. $ 11.90" disabled={!canEditGlobalCatalog} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Estado</span>
                <select
                  value={productFormValues.status}
                  onChange={(event) => handleFieldChange("status", event.target.value as ProductStatus)}
                  disabled={!canEditGlobalCatalog}
                  className="h-9 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="Activo">Activo</option>
                  <option value="Draft">Draft</option>
                </select>
              </label>
            </div>

            <div className="rounded-[1.25rem] border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Tamanos y presentaciones</p>
                  <p className="mt-1 text-xs text-muted-foreground">Define variantes vendibles cuando este producto cambie por tamano, porcion o presentacion.</p>
                </div>
                {canEditGlobalCatalog ? (
                  <Button type="button" variant="outline" className="rounded-xl" onClick={addVariantRow}>
                    <Plus />
                    Agregar tamano
                  </Button>
                ) : null}
              </div>

              {productFormValues.variants.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {productFormValues.variants.map((variant, index) => (
                    <div key={variant.id} className="grid gap-3 rounded-[1rem] border border-border bg-secondary/20 p-3 md:grid-cols-[1.3fr_1fr_auto_auto] md:items-end">
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium text-card-foreground">Nombre</span>
                        <Input value={variant.name} onChange={(event) => handleVariantChange(index, "name", event.target.value)} placeholder="Ej. Grande" disabled={!canEditGlobalCatalog} />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium text-card-foreground">Precio</span>
                        <Input value={variant.basePrice} onChange={(event) => handleVariantChange(index, "basePrice", event.target.value)} placeholder="Ej. $ 14.90" disabled={!canEditGlobalCatalog} />
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-card-foreground">
                        <input checked={variant.isDefault} onChange={() => handleDefaultVariantChange(index)} type="radio" name="defaultVariant" disabled={!canEditGlobalCatalog} />
                        Predeterminada
                      </label>
                      {canEditGlobalCatalog ? (
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeVariantRow(index)}>
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1rem] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  Este producto usa un precio base unico hasta que agregues variantes.
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Primary image path</span>
                <Input
                  value={productFormValues.primaryImagePath}
                  onChange={(event) => handleFieldChange("primaryImagePath", event.target.value)}
                  placeholder="tenants/tenant-id/products/product-id/primary/cover.jpg"
                  disabled={!canEditGlobalCatalog}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Image alt text</span>
                <Input
                  value={productFormValues.primaryImageAlt}
                  onChange={(event) => handleFieldChange("primaryImageAlt", event.target.value)}
                  placeholder="Describe la imagen principal"
                  disabled={!canEditGlobalCatalog}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Subir imagen principal</span>
              <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePrimaryImageFileChange} disabled={!canEditGlobalCatalog} />
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

            <div className="rounded-[1.25rem] border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Configuracion por sucursal</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Define disponibilidad, precio local y tiempo de preparacion sin duplicar el producto maestro.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {productFormValues.branchOverrides.map((branchOverride) => (
                  <div key={branchOverride.branchId} className="grid gap-3 rounded-[1rem] border border-border bg-secondary/20 p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{branchOverride.branchName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Operacion local de esta sucursal</p>
                    </div>

                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-card-foreground">Disponibilidad</span>
                      <select
                        value={branchOverride.availabilityStatus}
                        onChange={(event) => handleBranchOverrideChange(branchOverride.branchId, "availabilityStatus", event.target.value)}
                        className="h-9 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="available">Disponible</option>
                        <option value="paused">Pausado</option>
                        <option value="out_of_stock">Sin stock</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-card-foreground">Precio local</span>
                      <Input
                        value={branchOverride.priceOverride}
                        onChange={(event) => handleBranchOverrideChange(branchOverride.branchId, "priceOverride", event.target.value)}
                        placeholder="Usa precio base"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-card-foreground">Prep time</span>
                      <Input
                        value={branchOverride.prepTimeMinutes}
                        onChange={(event) => handleBranchOverrideChange(branchOverride.branchId, "prepTimeMinutes", event.target.value)}
                        placeholder="Ej. 12"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {formErrorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formErrorMessage}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleProductDialogOpenChange(false)} disabled={isSavingProduct}>
              Cerrar
            </Button>
            <Button onClick={saveProduct} disabled={isSavingProduct || isRunningRowAction}>
              {productDialogMode === "create" ? "Crear producto" : canEditGlobalCatalog ? "Guardar cambios" : "Guardar configuracion"}
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
