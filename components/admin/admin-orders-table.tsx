"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"

import { updateAdminOrderPaymentStatusAction, updateAdminOrderStatusAction } from "@/app/app/[tenantSlug]/admin/orders/actions"
import { formatManualPaymentMethod, formatOrderStatus, formatPaymentStatus, type AdminOrderSummary, type OrderStatus, type PaymentStatus } from "@/lib/domain/order"

import { Button } from "@/components/ui/button"
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
      return ["paid", "failed"]
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
            {orders.map((order) => {
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

      <div className="mt-4 rounded-[1.25rem] border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-600">
        En este MVP, las órdenes nuevas llegan como <span className="font-semibold text-stone-950">pago pendiente</span>. La acción principal es <span className="font-semibold text-stone-950">Confirmar pedido y pago</span>, que habilita el flujo operativo hacia cocina.
      </div>

      {errorMessage ? <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
    </>
  )
}
