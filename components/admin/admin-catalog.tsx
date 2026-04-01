"use client"

import * as React from "react"
import { MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react"

import { catalogProducts, type CatalogProduct } from "@/lib/config/admin-catalog"

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
  readonly initialProducts?: readonly CatalogProduct[]
}

export function AdminCatalogProducts({ initialProducts = catalogProducts }: AdminCatalogProductsProps) {
  const [products, setProducts] = React.useState<readonly CatalogProduct[]>(initialProducts)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("Todos")
  const [isProductDialogOpen, setIsProductDialogOpen] = React.useState(false)
  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = React.useState(false)
  const [productDialogMode, setProductDialogMode] = React.useState<ProductDialogMode>("create")
  const [productFormValues, setProductFormValues] = React.useState<ProductFormValues>(() => buildEmptyProduct(products.length))
  const [initialProductFormValues, setInitialProductFormValues] = React.useState<ProductFormValues>(() => buildEmptyProduct(products.length))

  const categoryFilters = React.useMemo(() => {
    return ["Todos", ...new Set(products.map((product) => product.category))].filter(Boolean)
  }, [products])

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
    setIsProductDialogOpen(true)
  }

  function openEditDialog(product: CatalogProduct) {
    const nextValues = buildFormValues(product)
    setProductDialogMode("edit")
    setInitialProductFormValues(nextValues)
    setProductFormValues(nextValues)
    setIsProductDialogOpen(true)
  }

  function duplicateProduct(product: CatalogProduct) {
    const duplicatedProduct: CatalogProduct = {
      ...product,
      id: `${product.id}-copy-${Date.now()}`,
      name: `${product.name} Copy`,
      status: "Draft",
    }

    setProducts((currentProducts) => [duplicatedProduct, ...currentProducts])
  }

  function toggleProductStatus(product: CatalogProduct) {
    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) => {
        if (currentProduct.id !== product.id) {
          return currentProduct
        }

        return {
          ...currentProduct,
          status: currentProduct.status === "Activo" ? "Draft" : "Activo",
        }
      })
    )
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
  }

  function handleFieldChange(field: keyof ProductFormValues, value: string) {
    setProductFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  function saveProduct() {
    if (!productFormValues.name.trim() || !productFormValues.category.trim() || !productFormValues.basePrice.trim()) {
      return
    }

    if (productDialogMode === "create") {
      const newProduct: CatalogProduct = {
        id: productFormValues.id,
        name: productFormValues.name.trim(),
        category: productFormValues.category.trim(),
        description: productFormValues.description.trim(),
        basePrice: productFormValues.basePrice.trim(),
        status: productFormValues.status,
        modifierGroups: [],
        tags: ["New"],
        branchStatuses: [
          { branchName: "Centro", availability: "Disponible", price: productFormValues.basePrice.trim(), prepTime: "10 min" },
          { branchName: "Norte", availability: "Pausado", price: productFormValues.basePrice.trim(), prepTime: "12 min" },
        ],
      }

      setProducts((currentProducts) => [newProduct, ...currentProducts])
      setInitialProductFormValues(buildFormValues(newProduct))
      setProductFormValues(buildFormValues(newProduct))
      closeProductDialog()
      return
    }

    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) => {
        if (currentProduct.id !== productFormValues.id) {
          return currentProduct
        }

        return {
          ...currentProduct,
          name: productFormValues.name.trim(),
          category: productFormValues.category.trim(),
          description: productFormValues.description.trim(),
          basePrice: productFormValues.basePrice.trim(),
          status: productFormValues.status,
          branchStatuses: currentProduct.branchStatuses.map((branchStatus, index) =>
            index === 0
              ? {
                  ...branchStatus,
                  price: productFormValues.basePrice.trim(),
                }
              : branchStatus
          ),
        }
      })
    )

    setInitialProductFormValues(productFormValues)
    closeProductDialog()
  }

  function saveAndCloseUnsavedDialog() {
    saveProduct()
  }

  function discardChanges() {
    setProductFormValues(initialProductFormValues)
    closeProductDialog()
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
                              <DropdownMenuItem onSelect={() => duplicateProduct(product)}>Duplicar</DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  openEditDialog(product)
                                }}
                              >
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => toggleProductStatus(product)}>
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

          <div className="grid gap-4 px-6 pb-2">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Nombre</span>
                <Input value={productFormValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} placeholder="Ej. Fire Smash Burger" />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-card-foreground">Categoria</span>
                <Input value={productFormValues.category} onChange={(event) => handleFieldChange("category", event.target.value)} placeholder="Ej. Burgers" />
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleProductDialogOpenChange(false)}>
              Cerrar
            </Button>
            <Button onClick={saveProduct}>{productDialogMode === "create" ? "Crear producto" : "Guardar cambios"}</Button>
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
            <Button variant="outline" onClick={() => setIsUnsavedDialogOpen(false)}>
              Seguir editando
            </Button>
            <Button variant="destructive" onClick={discardChanges}>
              Cerrar sin guardar
            </Button>
            <Button onClick={saveAndCloseUnsavedDialog}>Guardar y cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
