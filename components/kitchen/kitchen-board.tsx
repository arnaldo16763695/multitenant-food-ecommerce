"use client"

import * as React from "react"
import { ChefHat, Clock3, PackageCheck, PartyPopper, Search, TimerReset } from "lucide-react"
import { useRouter } from "next/navigation"

import { updateKitchenOrderItemPrepStatusAction, updateKitchenOrderStatusAction } from "@/app/app/[tenantSlug]/kitchen/actions"
import type { KitchenOrderSummary, OrderStatus } from "@/lib/domain/order"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

type KitchenBoardProps = {
  readonly tenantSlug: string
  readonly orders: readonly KitchenOrderSummary[]
}

type KitchenColumn = {
  readonly key: OrderStatus
  readonly title: string
  readonly description: string
}

const kitchenColumns: readonly KitchenColumn[] = [
  { key: "confirmed", title: "Confirmado", description: "Pedidos listos para entrar a preparación." },
  { key: "in_preparation", title: "En preparación", description: "Órdenes activas en cocina." },
  { key: "ready", title: "Listo", description: "Órdenes terminadas esperando entrega." },
  { key: "completed", title: "Completado", description: "Órdenes cerradas en este turno." },
] as const

function getColumnIcon(status: OrderStatus) {
  if (status === "confirmed") return Clock3
  if (status === "in_preparation") return ChefHat
  if (status === "ready") return PackageCheck

  return PartyPopper
}

function getNextKitchenStatus(status: OrderStatus) {
  switch (status) {
    case "confirmed":
      return "in_preparation" as const
    case "in_preparation":
      return "ready" as const
    case "ready":
      return "completed" as const
    default:
      return null
  }
}

function getNextKitchenLabel(status: OrderStatus) {
  switch (status) {
    case "confirmed":
      return "Iniciar preparación"
    case "in_preparation":
      return "Marcar orden lista"
    case "ready":
      return "Completar orden"
    default:
      return null
  }
}

function getOrderChannelLabel(channel: string) {
  if (channel === "web") return "Web"
  if (channel === "mobile") return "Mobile"
  if (channel === "admin") return "Admin"

  return channel
}

export function KitchenBoard({ tenantSlug, orders }: KitchenBoardProps) {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedBranch, setSelectedBranch] = React.useState("Todas")
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const branchOptions = React.useMemo(() => ["Todas", ...new Set(orders.map((order) => order.branchName))], [orders])

  const filteredOrders = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesBranch = selectedBranch === "Todas" || order.branchName === selectedBranch

      if (!matchesBranch) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return [String(order.orderNumber), order.customerName, order.branchName, ...order.items.map((item) => item.productName)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [orders, searchQuery, selectedBranch])

  const summary = React.useMemo(
    () => ({
      active: filteredOrders.filter((order) => order.status !== "completed").length,
      preparing: filteredOrders.filter((order) => order.status === "in_preparation").length,
      ready: filteredOrders.filter((order) => order.status === "ready").length,
    }),
    [filteredOrders]
  )

  const selectedOrder = React.useMemo(() => filteredOrders.find((order) => order.id === selectedOrderId) ?? null, [filteredOrders, selectedOrderId])
  const selectedOrderAllItemsReady = selectedOrder ? selectedOrder.items.every((item) => item.prepStatus === "ready") : false

  function handleStatusChange(orderId: string, nextStatus: OrderStatus) {
    setErrorMessage("")

    startTransition(async () => {
      const result = await updateKitchenOrderStatusAction(tenantSlug, orderId, nextStatus)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos actualizar la orden desde kitchen.")
        return
      }

      router.refresh()
    })
  }

  function handleItemPrepStatusChange(orderId: string, orderItemId: string, checked: boolean) {
    setErrorMessage("")

    startTransition(async () => {
      const result = await updateKitchenOrderItemPrepStatusAction(tenantSlug, orderId, orderItemId, checked ? "ready" : "pending")

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos actualizar el item.")
        return
      }

      router.refresh()
    })
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <section>
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-sm font-semibold text-card-foreground">Control de cocina</p>
                <span className="text-xs text-muted-foreground">Búsqueda y foco operativo</span>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-9 pl-9" placeholder="Buscar orden, cliente o item" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <select
                value={selectedBranch}
                onChange={(event) => setSelectedBranch(event.target.value)}
                className="h-9 min-w-44 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {branchOptions.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <div className="rounded-[1rem] border border-border bg-secondary/35 px-3 py-2 text-sm">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Activas</span>
                <p className="mt-1 text-lg font-semibold text-card-foreground">{summary.active}</p>
              </div>
              <div className="rounded-[1rem] border border-border bg-secondary/35 px-3 py-2 text-sm">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Preparando</span>
                <p className="mt-1 text-lg font-semibold text-card-foreground">{summary.preparing}</p>
              </div>
              <div className="rounded-[1rem] border border-border bg-secondary/35 px-3 py-2 text-sm">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Listas</span>
                <p className="mt-1 text-lg font-semibold text-card-foreground">{summary.ready}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {kitchenColumns.map((column) => {
          const Icon = getColumnIcon(column.key)
          const columnOrders = filteredOrders.filter((order) => order.status === column.key)

          return (
            <section key={column.key} className="flex min-h-[30rem] flex-col rounded-[1.75rem] border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary/60 text-card-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-card-foreground">{column.title}</h2>
                    <p className="text-xs leading-5 text-muted-foreground">{column.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                {columnOrders.length > 0 ? (
                  columnOrders.map((order) => {
                    const nextStatus = getNextKitchenStatus(order.status)
                    const nextLabel = getNextKitchenLabel(order.status)
                    const readyItemsCount = order.items.filter((item) => item.prepStatus === "ready").length

                    return (
                      <article key={order.id} className="rounded-[1.35rem] border border-border bg-secondary/35 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-card-foreground">#{order.orderNumber}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{order.customerName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline">{order.fulfillmentType === "pickup" ? "Pickup" : "Delivery"}</Badge>
                            <Badge variant="secondary">{getOrderChannelLabel(order.channel)}</Badge>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                          <p>Sucursal: {order.branchName}</p>
                          <p>Items: {readyItemsCount}/{order.itemCount} listos</p>
                          <p>Total: $ {order.totalAmount.toFixed(2)}</p>
                          <p>Hora: {new Date(order.placedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
                          <p>Notas: {order.notes || "Sin notas"}</p>
                        </div>

                        <Sheet open={selectedOrderId === order.id} onOpenChange={(open) => setSelectedOrderId(open ? order.id : null)}>
                          <Button variant="outline" className="mt-4 w-full rounded-xl justify-between" onClick={() => setSelectedOrderId(order.id)}>
                            Ver detalle
                          </Button>
                          <SheetContent className="sm:max-w-xl">
                            {selectedOrder ? (
                              <>
                                <SheetHeader>
                                  <SheetTitle>Orden #{selectedOrder.orderNumber}</SheetTitle>
                                  <SheetDescription>Marca cada item como listo antes de finalizar la orden.</SheetDescription>
                                </SheetHeader>

                                <div className="grid gap-4 px-4 pb-4 text-sm">
                                  <div className="rounded-[1.25rem] bg-secondary/40 p-4 text-muted-foreground">
                                    <p>Cliente: <span className="font-semibold text-card-foreground">{selectedOrder.customerName}</span></p>
                                    <p className="mt-2">Sucursal: <span className="font-semibold text-card-foreground">{selectedOrder.branchName}</span></p>
                                    <p className="mt-2">Notas: <span className="font-semibold text-card-foreground">{selectedOrder.notes || "Sin notas"}</span></p>
                                  </div>

                                  <div className="rounded-[1.25rem] border border-border p-4">
                                    <p className="font-semibold text-card-foreground">Checklist de preparación</p>
                                    <div className="mt-4 space-y-3">
                                      {selectedOrder.items.map((item) => (
                                        <label key={item.id} className="flex items-center gap-3 rounded-[1rem] bg-secondary/35 px-3 py-3">
                                          <Checkbox
                                            checked={item.prepStatus === "ready"}
                                            disabled={isPending || selectedOrder.status === "completed"}
                                            onCheckedChange={(checked) => handleItemPrepStatusChange(selectedOrder.id, item.id, checked === true)}
                                          />
                                          <div className="flex flex-1 items-center justify-between gap-3">
                                            <span className="text-card-foreground">{item.productName}</span>
                                            <span className="font-medium text-muted-foreground">x{item.quantity}</span>
                                          </div>
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  {nextStatus && nextLabel ? (
                                    <Button
                                      className="w-full rounded-xl"
                                      disabled={isPending || (nextStatus === "ready" && !selectedOrderAllItemsReady)}
                                      onClick={() => handleStatusChange(selectedOrder.id, nextStatus)}
                                    >
                                      <TimerReset />
                                      {nextLabel}
                                    </Button>
                                  ) : null}

                                  {nextStatus === "ready" && !selectedOrderAllItemsReady ? (
                                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                      Debes marcar todos los items como listos antes de finalizar la orden.
                                    </p>
                                  ) : null}
                                </div>
                              </>
                            ) : null}
                          </SheetContent>
                        </Sheet>

                        {nextStatus && nextLabel ? (
                          <Button className="mt-4 w-full rounded-xl" disabled={isPending || (nextStatus === "ready" && readyItemsCount !== order.itemCount)} onClick={() => handleStatusChange(order.id, nextStatus)}>
                            <TimerReset />
                            {nextLabel}
                          </Button>
                        ) : null}
                      </article>
                    )
                  })
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded-[1.35rem] border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                    No hay órdenes en esta columna.
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </section>

      {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
    </main>
  )
}
