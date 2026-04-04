"use client"

import * as React from "react"
import Link from "next/link"
import { MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"

import { updateAdminOrderStatusAction } from "@/app/app/[tenantSlug]/admin/orders/actions"
import type { AdminOrderSummary, OrderStatus } from "@/lib/domain/order"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type AdminOrdersTableProps = {
  readonly tenantSlug: string
  readonly orders: readonly AdminOrderSummary[]
}

function formatOrderStatus(status: string) {
  switch (status) {
    case "pending_payment":
      return "Pago pendiente"
    case "confirmed":
      return "Confirmado"
    case "in_preparation":
      return "En preparación"
    case "ready":
      return "Listo"
    case "completed":
      return "Completado"
    case "cancelled":
      return "Cancelado"
    default:
      return status
  }
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

  return (
    <>
      <div className="overflow-hidden rounded-[1.25rem] border border-border">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Sucursal</TableHead>
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

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-semibold text-card-foreground">#{order.orderNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{order.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">{order.branchName}</TableCell>
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
                  <TableCell className="text-muted-foreground">{new Date(order.placedAt).toLocaleString("es-MX")}</TableCell>
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
