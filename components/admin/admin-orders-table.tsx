"use client"

import * as React from "react"
import Link from "next/link"
import { MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"

import { updateAdminOrderPaymentStatusAction, updateAdminOrderStatusAction } from "@/app/app/[tenantSlug]/admin/orders/actions"
import { formatOrderStatus, formatPaymentStatus, type AdminOrderSummary, type OrderStatus, type PaymentStatus } from "@/lib/domain/order"

import { Button } from "@/components/ui/button"
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

export function AdminOrdersTable({ tenantSlug, orders }: AdminOrdersTableProps) {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

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
      <div className="overflow-hidden rounded-[1.25rem] border border-border">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[72px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const selectableStatuses = getSelectableStatuses(order.status)
              const selectablePaymentStatuses = getSelectablePaymentStatuses(order.paymentStatus)

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-semibold text-card-foreground">#{order.orderNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{order.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">{order.branchName}</TableCell>
                  <TableCell>
                    <select
                      className="h-9 min-w-36 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={order.paymentStatus}
                      disabled={isPending || selectablePaymentStatuses.length === 1}
                      onChange={(event) => handlePaymentStatusChange(order.id, event.target.value as PaymentStatus)}
                    >
                      {selectablePaymentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {formatPaymentStatus(status)}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <select
                      className="h-9 min-w-44 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={order.status}
                      disabled={isPending || selectableStatuses.length === 1}
                      onChange={(event) => handleStatusChange(order.id, event.target.value as OrderStatus)}
                    >
                      {selectableStatuses.map((status) => (
                        <option key={status} value={status}>
                          {formatOrderStatus(status)}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatOrderChannel(order.channel)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocalizedDateTime value={order.placedAt} />
                  </TableCell>
                  <TableCell className="text-right font-medium text-card-foreground">$ {order.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal />
                            <span className="sr-only">Open order actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
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

      {errorMessage ? <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
    </>
  )
}
