"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye, MoreHorizontal, Search } from "lucide-react"
import { useRouter } from "next/navigation"

import { updateAdminOrderPaymentStatusAction, updateAdminOrderStatusAction } from "@/app/app/[tenantSlug]/admin/orders/actions"
import { formatManualPaymentMethod, formatOrderStatus, formatPaymentStatus, type AdminOrderSummary, type OrderStatus, type PaymentStatus } from "@/lib/domain/order"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LocalizedDateTime } from "@/components/ui/localized-date-time"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type OrderQueueFilter = "all" | "needs_review" | "rejected" | "ready_to_confirm" | "confirmed"

function getOrderPriority(order: AdminOrderSummary) {
  if (order.paymentStatus === "failed") return 0
  if (order.status === "pending_payment" && order.hasPaymentReceipt) return 1
  if (order.status === "pending_payment") return 2
  if (order.status === "confirmed") return 3
  if (order.status === "in_preparation") return 4
  if (order.status === "ready") return 5

  return 6
}

function isReadyToConfirm(order: AdminOrderSummary) {
  return order.status === "pending_payment" && order.paymentStatus === "pending" && order.hasPaymentReceipt
}

function matchesQueueFilter(order: AdminOrderSummary, queueFilter: OrderQueueFilter) {
  switch (queueFilter) {
    case "needs_review":
      return order.status === "pending_payment"
    case "rejected":
      return order.paymentStatus === "failed"
    case "ready_to_confirm":
      return isReadyToConfirm(order)
    case "confirmed":
      return order.status === "confirmed" || order.status === "in_preparation" || order.status === "ready" || order.status === "completed"
    default:
      return true
  }
}

type AdminOrdersTableProps = {
  readonly tenantSlug: string
  readonly orders: readonly AdminOrderSummary[]
}

function formatOrderChannel(channel: string) {
  if (channel === "web") return "Web"
  if (channel === "mobile") return "Mobile"
  if (channel === "admin") return "Admin"

  return channel
}

function getNextStatuses(status: string): readonly OrderStatus[] {
  switch (status) {
    case "pending_payment":
      return ["confirmed", "cancelled"]
    case "confirmed":
      return ["in_preparation", "cancelled"]
    case "in_preparation":
      return ["ready", "cancelled"]
    case "ready":
      return ["completed", "cancelled"]
    default:
      return []
  }
}

function getSelectableStatuses(status: string) {
  return [status as OrderStatus, ...getNextStatuses(status)]
}

function formatOrderStatusOption(status: OrderStatus, currentStatus: string) {
  if (currentStatus === "pending_payment" && status === "confirmed") {
    return "Confirmar pedido y pago"
  }

  if (currentStatus === "pending_payment" && status === "cancelled") {
    return "Cancelar pedido"
  }

  return formatOrderStatus(status)
}

function getNextPaymentStatuses(status: PaymentStatus): readonly PaymentStatus[] {
  switch (status) {
    case "pending":
      return ["paid"]
    case "paid":
      return ["refunded"]
    case "failed":
      return ["pending", "paid"]
    default:
      return []
  }
}

function getSelectablePaymentStatuses(status: PaymentStatus) {
  return [status, ...getNextPaymentStatuses(status)]
}

function canEditPaymentStatus(order: AdminOrderSummary) {
  return order.status !== "pending_payment"
}

export function AdminOrdersTable({ tenantSlug, orders }: AdminOrdersTableProps) {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const [receiptOrderId, setReceiptOrderId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [queueFilter, setQueueFilter] = React.useState<OrderQueueFilter>("all")
  const [paymentFilter, setPaymentFilter] = React.useState<PaymentStatus | "all">("all")
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "all">("all")
  const [receiptFilter, setReceiptFilter] = React.useState<"all" | "with_receipt" | "without_receipt">("all")
  const [branchFilter, setBranchFilter] = React.useState<string>("all")

  const branchOptions = React.useMemo(
    () => ["all", ...new Set(orders.map((order) => order.branchName).filter(Boolean))],
    [orders]
  )

  const summary = React.useMemo(
    () => ({
      pending: orders.filter((order) => order.status === "pending_payment").length,
      rejected: orders.filter((order) => order.paymentStatus === "failed").length,
      readyToConfirm: orders.filter((order) => isReadyToConfirm(order)).length,
      inKitchen: orders.filter((order) => order.status === "in_preparation" || order.status === "ready").length,
    }),
    [orders]
  )

  const filteredOrders = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return [...orders]
      .sort((left, right) => {
        const priorityDelta = getOrderPriority(left) - getOrderPriority(right)

        if (priorityDelta !== 0) {
          return priorityDelta
        }

        return new Date(right.placedAt).getTime() - new Date(left.placedAt).getTime()
      })
      .filter((order) => {
        if (!matchesQueueFilter(order, queueFilter)) {
          return false
        }

        if (paymentFilter !== "all" && order.paymentStatus !== paymentFilter) {
          return false
        }

        if (statusFilter !== "all" && order.status !== statusFilter) {
          return false
        }

        if (receiptFilter === "with_receipt" && !order.hasPaymentReceipt) {
          return false
        }

        if (receiptFilter === "without_receipt" && order.hasPaymentReceipt) {
          return false
        }

        if (branchFilter !== "all" && order.branchName !== branchFilter) {
          return false
        }

        if (!normalizedQuery) {
          return true
        }

        return [String(order.orderNumber), order.customerName, order.branchName, order.paymentMethod ?? "", order.channel]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      })
  }, [orders, searchQuery, queueFilter, paymentFilter, statusFilter, receiptFilter, branchFilter])

  function handleStatusChange(orderId: string, nextStatus: OrderStatus) {
    setErrorMessage("")

    startTransition(async () => {
      const result = await updateAdminOrderStatusAction(tenantSlug, orderId, nextStatus)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos actualizar la orden.")
        return
      }

      router.refresh()
    })
  }

  function handlePaymentStatusChange(orderId: string, nextPaymentStatus: PaymentStatus) {
    setErrorMessage("")

    startTransition(async () => {
      const result = await updateAdminOrderPaymentStatusAction(tenantSlug, orderId, nextPaymentStatus)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos actualizar el pago.")
        return
      }

      router.refresh()
    })
  }

  return (
    <>
      <div className="mb-4 grid gap-3">
        <div className="grid gap-3 rounded-[1rem] border border-border bg-card p-3.5">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-card-foreground">Cola operativa</p>
              <p className="truncate text-xs text-muted-foreground">Prioriza rechazos, pagos pendientes con comprobante y órdenes listas para confirmar.</p>
            </div>
            <div className="relative w-full xl:max-w-sm xl:min-w-[20rem]">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar pedido, cliente o sucursal" value={searchQuery} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:flex-nowrap xl:overflow-x-auto">
              <Button className="h-7 rounded-full px-3 text-xs" onClick={() => setQueueFilter("all")} type="button" variant={queueFilter === "all" ? "default" : "outline"}>
                Todas
              </Button>
              <Button className="h-7 rounded-full px-3 text-xs" onClick={() => setQueueFilter("needs_review")} type="button" variant={queueFilter === "needs_review" ? "default" : "outline"}>
                Pendientes
              </Button>
              <Button className="h-7 rounded-full px-3 text-xs" onClick={() => setQueueFilter("rejected")} type="button" variant={queueFilter === "rejected" ? "default" : "outline"}>
                Rechazados
              </Button>
              <Button className="h-7 rounded-full px-3 text-xs" onClick={() => setQueueFilter("ready_to_confirm")} type="button" variant={queueFilter === "ready_to_confirm" ? "default" : "outline"}>
                Listos para confirmar
              </Button>
              <Button className="h-7 rounded-full px-3 text-xs" onClick={() => setQueueFilter("confirmed")} type="button" variant={queueFilter === "confirmed" ? "default" : "outline"}>
                Confirmados
              </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <div className="rounded-[1rem] border border-border bg-card p-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Pendientes</p>
              <p className="mt-1 text-2xl font-semibold text-card-foreground">{summary.pending}</p>
            </div>
            <div className="rounded-[1rem] border border-amber-200 bg-amber-50/60 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">Rechazados</p>
              <p className="mt-1 text-2xl font-semibold text-amber-900">{summary.rejected}</p>
            </div>
            <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50/60 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">Listos para confirmar</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-900">{summary.readyToConfirm}</p>
            </div>
            <div className="rounded-[1rem] border border-border bg-card p-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">En cocina</p>
              <p className="mt-1 text-2xl font-semibold text-card-foreground">{summary.inKitchen}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 rounded-[1rem] border border-border bg-card p-3.5 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Estado de pago</span>
            <select className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" onChange={(event) => setPaymentFilter(event.target.value as PaymentStatus | "all")} value={paymentFilter}>
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="failed">Rechazado</option>
              <option value="paid">Pagado</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Estado de orden</span>
            <select className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "all")} value={statusFilter}>
              <option value="all">Todos</option>
              <option value="pending_payment">Pago pendiente</option>
              <option value="confirmed">Confirmado</option>
              <option value="in_preparation">En preparación</option>
              <option value="ready">Listo</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Comprobante</span>
            <select className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" onChange={(event) => setReceiptFilter(event.target.value as "all" | "with_receipt" | "without_receipt")} value={receiptFilter}>
              <option value="all">Todos</option>
              <option value="with_receipt">Con comprobante</option>
              <option value="without_receipt">Sin comprobante</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Sucursal</span>
            <select className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" onChange={(event) => setBranchFilter(event.target.value)} value={branchFilter}>
              {branchOptions.map((branchName) => (
                <option key={branchName} value={branchName}>
                  {branchName === "all" ? "Todas" : branchName}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1rem] border border-border">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead className="h-10 px-3 text-xs">Pedido</TableHead>
              <TableHead className="h-10 px-3 text-xs">Cliente</TableHead>
              <TableHead className="h-10 px-3 text-xs">Sucursal</TableHead>
              <TableHead className="h-10 px-3 text-xs">Pago</TableHead>
              <TableHead className="h-10 px-3 text-xs">Comprobante</TableHead>
              <TableHead className="h-10 px-3 text-xs">Estado</TableHead>
              <TableHead className="h-10 px-3 text-xs">Canal</TableHead>
              <TableHead className="h-10 px-3 text-xs">Fecha</TableHead>
              <TableHead className="h-10 px-3 text-right text-xs">Total</TableHead>
              <TableHead className="h-10 w-[64px] px-3 text-right text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => {
              const selectableStatuses = getSelectableStatuses(order.status)
              const selectablePaymentStatuses = getSelectablePaymentStatuses(order.paymentStatus)
              const paymentEditable = canEditPaymentStatus(order)

              return (
                <TableRow key={order.id}>
                  <TableCell className="px-3 py-2 font-semibold text-card-foreground">#{order.orderNumber}</TableCell>
                  <TableCell className="px-3 py-2 text-muted-foreground">{order.customerName}</TableCell>
                  <TableCell className="px-3 py-2 text-muted-foreground">{order.branchName}</TableCell>
                  <TableCell className="px-3 py-2">
                    <select
                      className="h-8 min-w-32 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={order.paymentStatus}
                      disabled={isPending || selectablePaymentStatuses.length === 1 || !paymentEditable}
                      onChange={(event) => handlePaymentStatusChange(order.id, event.target.value as PaymentStatus)}
                    >
                      {selectablePaymentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {formatPaymentStatus(status)}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {order.paymentMethod ? formatManualPaymentMethod(order.paymentMethod) : "Sin método"}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {order.paymentReceiptSignedUrl ? (
                      <Dialog open={receiptOrderId === order.id} onOpenChange={(open) => setReceiptOrderId(open ? order.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs">
                            <Eye />
                            Ver
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[min(94vw,900px)]">
                          <DialogHeader>
                            <DialogTitle>Comprobante de la orden #{order.orderNumber}</DialogTitle>
                            <DialogDescription>
                              {order.paymentMethod ? formatManualPaymentMethod(order.paymentMethod) : "Pago manual"} de {order.customerName}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="px-6 pb-6">
                            <div className="overflow-hidden rounded-[1rem] border border-border bg-muted/20 p-3">
                              <Image
                                alt={`Comprobante de la orden ${order.orderNumber}`}
                                className="max-h-[70vh] w-full rounded-[0.9rem] object-contain"
                                height={1400}
                                src={order.paymentReceiptSignedUrl}
                                unoptimized
                                width={1400}
                              />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pendiente</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <select
                      className="h-8 min-w-40 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={order.status}
                      disabled={isPending || selectableStatuses.length === 1}
                      onChange={(event) => handleStatusChange(order.id, event.target.value as OrderStatus)}
                    >
                      {selectableStatuses.map((status) => (
                        <option key={status} value={status}>
                          {formatOrderStatusOption(status, order.status)}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-muted-foreground">{formatOrderChannel(order.channel)}</TableCell>
                  <TableCell className="px-3 py-2 text-muted-foreground">
                    <LocalizedDateTime value={order.placedAt} />
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right font-medium text-card-foreground">$ {order.totalAmount.toFixed(2)}</TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal />
                            <span className="sr-only">Open order actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem asChild>
                            <Link href={`/app/${tenantSlug}/admin/orders/${order.id}`}>Ver detalle</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="mt-4 rounded-[1rem] border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
          No encontramos órdenes con los filtros actuales.
        </div>
      ) : null}

      <div className="mt-4 rounded-[1.25rem] border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-600">
        En este MVP, las órdenes nuevas llegan como <span className="font-semibold text-stone-950">pago pendiente</span>. La acción principal es <span className="font-semibold text-stone-950">Confirmar pedido y pago</span>, que habilita el flujo operativo hacia cocina.
      </div>

      {errorMessage ? <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
    </>
  )
}
