"use client"

import * as React from "react"
import { ChefHat, Clock3, Hand, PackageCheck, Search, TimerReset, Undo2 } from "lucide-react"

import {
  assignKitchenOrderAction,
  releaseKitchenOrderAction,
  updateKitchenOrderItemPrepStatusAction,
  updateKitchenOrderStatusAction,
} from "@/app/app/[tenantSlug]/kitchen/actions"
import type { KitchenOrderSummary, OrderStatus } from "@/lib/domain/order"
import { formatModifierSelectionLabel } from "@/lib/storefront/modifier-display"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { LocalizedDateTime } from "@/components/ui/localized-date-time"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

type KitchenBoardProps = {
  readonly tenantSlug: string
  readonly orders: readonly KitchenOrderSummary[]
  readonly currentMembershipId: string
  readonly currentStaffName: string
  readonly activeBranchName: string
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
] as const

function getColumnIcon(status: OrderStatus) {
  if (status === "confirmed") return Clock3
  if (status === "in_preparation") return ChefHat
  if (status === "ready") return PackageCheck

  return PackageCheck
}

function getNextKitchenStatus(status: OrderStatus) {
  switch (status) {
    case "confirmed":
      return "in_preparation" as const
    case "in_preparation":
      return "ready" as const
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

function updateOrderInCollection(
  collection: readonly KitchenOrderSummary[],
  orderId: string,
  updater: (order: KitchenOrderSummary) => KitchenOrderSummary
) {
  return collection.map((order) => (order.id === orderId ? updater(order) : order))
}

function formatOrderAmount(value: number) {
  const normalizedValue = Number(value)

  if (!Number.isFinite(normalizedValue)) {
    return "0.00"
  }

  return normalizedValue.toFixed(2)
}

export function KitchenBoard({ tenantSlug, orders, currentMembershipId, currentStaffName, activeBranchName }: KitchenBoardProps) {
  const [errorMessage, setErrorMessage] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null)
  const [optimisticOrders, setOptimisticOrders] = React.useState<readonly KitchenOrderSummary[]>(orders)
  const [pendingOrderIds, setPendingOrderIds] = React.useState<readonly string[]>([])
  const [pendingItemIds, setPendingItemIds] = React.useState<readonly string[]>([])

  React.useEffect(() => {
    setOptimisticOrders(orders)
  }, [orders])

  const filteredOrders = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return optimisticOrders.filter((order) => {
      if (!normalizedQuery) {
        return true
      }

      return [String(order.orderNumber), order.customerName, order.branchName, ...order.items.map((item) => item.productName)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [optimisticOrders, searchQuery])

  const summary = React.useMemo(
    () => ({
      active: filteredOrders.length,
      preparing: filteredOrders.filter((order) => order.status === "in_preparation").length,
      ready: filteredOrders.filter((order) => order.status === "ready").length,
    }),
    [filteredOrders]
  )

  const selectedOrder = React.useMemo(() => optimisticOrders.find((order) => order.id === selectedOrderId) ?? null, [optimisticOrders, selectedOrderId])
  const selectedOrderAllItemsReady = selectedOrder ? selectedOrder.items.every((item) => item.prepStatus === "ready") : false

  async function handleAssignOrder(orderId: string) {
    setErrorMessage("")

    const previousOrders = optimisticOrders
    setPendingOrderIds((current) => [...current, orderId])
    setOptimisticOrders((current) =>
      updateOrderInCollection(current, orderId, (order) => ({
          ...order,
          status: order.status === "confirmed" ? "in_preparation" : order.status,
          assignedMembershipId: currentMembershipId,
          assignedStaffName: currentStaffName,
        }))
    )

    const result = await assignKitchenOrderAction(tenantSlug, orderId)

    setPendingOrderIds((current) => current.filter((id) => id !== orderId))

    if (!result.ok) {
      setOptimisticOrders(previousOrders)
      setErrorMessage(result.error ?? "No pudimos tomar la orden.")
    }
  }

  async function handleReleaseOrder(orderId: string) {
    setErrorMessage("")

    const previousOrders = optimisticOrders
    setPendingOrderIds((current) => [...current, orderId])
    setOptimisticOrders((current) =>
      updateOrderInCollection(current, orderId, (order) => ({
        ...order,
        status: order.status === "in_preparation" || order.status === "ready" ? "confirmed" : order.status,
        assignedMembershipId: null,
        assignedStaffName: null,
      }))
    )

    const result = await releaseKitchenOrderAction(tenantSlug, orderId)

    setPendingOrderIds((current) => current.filter((id) => id !== orderId))

    if (!result.ok) {
      setOptimisticOrders(previousOrders)
      setErrorMessage(result.error ?? "No pudimos soltar la orden.")
    }
  }

  function getAssignedLabel(order: KitchenOrderSummary) {
    if (order.assignedStaffName) {
      return `Tomada por ${order.assignedStaffName}`
    }

    // Unassigned orders already in kitchen states were likely advanced from admin.
    if (order.status !== "confirmed") {
      return "Movida desde admin, pendiente de tomar"
    }

    return "Sin asignar"
  }

  async function handleStatusChange(orderId: string, nextStatus: OrderStatus) {
    setErrorMessage("")

    const previousOrders = optimisticOrders
    setPendingOrderIds((current) => [...current, orderId])
    setOptimisticOrders((current) =>
      updateOrderInCollection(current, orderId, (order) => ({
        ...order,
        status: nextStatus,
      }))
    )

    const result = await updateKitchenOrderStatusAction(tenantSlug, orderId, nextStatus)

    setPendingOrderIds((current) => current.filter((id) => id !== orderId))

    if (!result.ok) {
      setOptimisticOrders(previousOrders)
      setErrorMessage(result.error ?? "No pudimos actualizar la orden desde kitchen.")
    }
  }

  async function handleItemPrepStatusChange(orderId: string, orderItemId: string, checked: boolean) {
    setErrorMessage("")

    const previousOrders = optimisticOrders
    const nextPrepStatus = checked ? "ready" : "pending"

    setPendingItemIds((current) => [...current, orderItemId])
    setOptimisticOrders((current) =>
      updateOrderInCollection(current, orderId, (order) => ({
        ...order,
        items: order.items.map((item) => (item.id === orderItemId ? { ...item, prepStatus: nextPrepStatus } : item)),
      }))
    )

    const result = await updateKitchenOrderItemPrepStatusAction(tenantSlug, orderId, orderItemId, nextPrepStatus)

    setPendingItemIds((current) => current.filter((id) => id !== orderItemId))

    if (!result.ok) {
      setOptimisticOrders(previousOrders)
      setErrorMessage(result.error ?? "No pudimos actualizar el item.")
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
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

            <div className="rounded-[1rem] border border-border bg-secondary/35 px-3 py-2 text-sm xl:ml-auto">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sucursal activa</span>
              <p className="mt-1 text-sm font-semibold text-card-foreground">{activeBranchName}</p>
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

      <section className="grid gap-4 lg:grid-cols-3">
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
                    const isOrderPending = pendingOrderIds.includes(order.id)
                    const isAssignedToCurrentMember = order.assignedMembershipId === currentMembershipId
                    const canOperateOrder = isAssignedToCurrentMember
                    const needsAssignment = !order.assignedMembershipId
                    const assignedLabel = getAssignedLabel(order)
                    const canReleaseOrder = isAssignedToCurrentMember

                    return (
                      <article key={order.id} className="rounded-[1.35rem] border border-border bg-secondary/35 p-4 transition-opacity data-[pending=true]:opacity-80" data-pending={isOrderPending}>
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
                          <p>Asignacion: {assignedLabel}</p>
                          <p>Items: {readyItemsCount}/{order.itemCount} listos</p>
                          <p>Total: $ {formatOrderAmount(order.totalAmount)}</p>
                          <p>
                            Hora: <LocalizedDateTime value={order.placedAt} kind="time" />
                          </p>
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
                                    <p className="mt-2">Asignación: <span className="font-semibold text-card-foreground">{getAssignedLabel(selectedOrder)}</span></p>
                                    <p className="mt-2">Notas: <span className="font-semibold text-card-foreground">{selectedOrder.notes || "Sin notas"}</span></p>
                                  </div>

                                  <div className="rounded-[1.25rem] border border-border p-4">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="font-semibold text-card-foreground">Checklist de preparación</p>
                                      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Toque rápido, sync en background</span>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                      {selectedOrder.items.map((item) => {
                                        const isItemPending = pendingItemIds.includes(item.id)
                                        const selectedOrderCanOperate = selectedOrder.assignedMembershipId === currentMembershipId

                                        return (
                                          <label
                                            key={item.id}
                                            className="flex items-center gap-3 rounded-[1rem] border border-transparent bg-secondary/35 px-3 py-3 transition-all data-[pending=true]:border-amber-200 data-[pending=true]:bg-amber-50/80"
                                            data-pending={isItemPending}
                                          >
                                            <Checkbox
                                              checked={item.prepStatus === "ready"}
                                              disabled={isItemPending || !selectedOrderCanOperate}
                                              onCheckedChange={(checked) => handleItemPrepStatusChange(selectedOrder.id, item.id, checked === true)}
                                            />
                                            <div className="flex flex-1 items-center justify-between gap-3">
                                               <div>
                                                 <span className="text-card-foreground">{item.productName}</span>
                                                 {item.modifiers.length > 0 ? (
                                                   <div className="mt-1 flex flex-wrap gap-1.5">
                                                     {item.modifiers.map((modifier) => (
                                                       <span
                                                         key={`${modifier.modifierGroupName}:${modifier.modifierOptionName}`}
                                                         className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                                                       >
                                                         {formatModifierSelectionLabel(modifier)}
                                                       </span>
                                                     ))}
                                                   </div>
                                                 ) : null}
                                                 {item.comboComponents.length > 0 ? (
                                                   <p className="mt-1 text-xs text-muted-foreground">
                                                     Incluye: {item.comboComponents.map((component) => `${component.quantity}x ${component.componentProductName}${component.componentVariantName ? ` (${component.componentVariantName})` : ""}`).join(", ")}
                                                   </p>
                                                 ) : null}
                                                 {isItemPending ? <p className="mt-1 text-xs text-amber-700">Guardando cambio...</p> : null}
                                               </div>
                                              <span className="font-medium text-muted-foreground">x{item.quantity}</span>
                                            </div>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  </div>

                                  {nextStatus && nextLabel ? (
                                    <Button
                                      className="w-full rounded-xl"
                                      disabled={
                                        isOrderPending ||
                                        !(selectedOrder.assignedMembershipId === currentMembershipId) ||
                                        (nextStatus === "ready" && !selectedOrderAllItemsReady)
                                      }
                                      onClick={() => handleStatusChange(selectedOrder.id, nextStatus)}
                                    >
                                      <TimerReset />
                                      {isOrderPending ? "Actualizando orden..." : nextLabel}
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

                        {order.status === "confirmed" && needsAssignment ? (
                          <Button className="mt-4 w-full rounded-xl" disabled={isOrderPending} onClick={() => handleAssignOrder(order.id)}>
                            <Hand />
                            {isOrderPending ? "Tomando orden..." : "Tomar orden"}
                          </Button>
                        ) : null}

                        {order.status !== "confirmed" && needsAssignment ? (
                          <Button className="mt-4 w-full rounded-xl" disabled={isOrderPending} onClick={() => handleAssignOrder(order.id)}>
                            <Hand />
                            {isOrderPending ? "Tomando orden..." : "Tomar desde kitchen"}
                          </Button>
                        ) : null}

                        {nextStatus && nextLabel ? (
                          <Button
                            className="mt-4 w-full rounded-xl"
                            disabled={isOrderPending || !canOperateOrder || (nextStatus === "ready" && readyItemsCount !== order.itemCount)}
                            onClick={() => handleStatusChange(order.id, nextStatus)}
                          >
                            <TimerReset />
                            {isOrderPending ? "Actualizando orden..." : nextLabel}
                          </Button>
                        ) : null}

                        {canReleaseOrder ? (
                          <Button className="mt-3 w-full rounded-xl" variant="outline" disabled={isOrderPending} onClick={() => handleReleaseOrder(order.id)}>
                            <Undo2 />
                            {isOrderPending ? "Soltando orden..." : "Soltar orden"}
                          </Button>
                        ) : null}

                        {!canOperateOrder && order.assignedStaffName ? (
                          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                            Esta orden esta siendo trabajada por {order.assignedStaffName}.
                          </p>
                        ) : null}

                        {!order.assignedStaffName && order.status !== "confirmed" ? (
                          <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                            Admin movió esta orden y sigue sin preparador asignado. Tómala para continuarla desde kitchen.
                          </p>
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
    </div>
  )
}
