"use client"

import * as React from "react"
import { Clock3, PackageCheck, ChefHat, PartyPopper } from "lucide-react"
import { useRouter } from "next/navigation"

import { updateKitchenOrderStatusAction } from "@/app/app/[tenantSlug]/kitchen/actions"
import type { KitchenOrderSummary, OrderStatus } from "@/lib/domain/order"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
  {
    key: "confirmed",
    title: "Confirmado",
    description: "Pedidos listos para entrar a preparación.",
  },
  {
    key: "in_preparation",
    title: "En preparación",
    description: "Órdenes activas en cocina.",
  },
  {
    key: "ready",
    title: "Listo",
    description: "Órdenes terminadas esperando entrega.",
  },
  {
    key: "completed",
    title: "Completado",
    description: "Órdenes cerradas en este turno.",
  },
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
      return "Marcar listo"
    case "ready":
      return "Completar orden"
    default:
      return null
  }
}

export function KitchenBoard({ tenantSlug, orders }: KitchenBoardProps) {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

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

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <section className="grid gap-4 lg:grid-cols-4">
        {kitchenColumns.map((column) => {
          const Icon = getColumnIcon(column.key)
          const columnOrders = orders.filter((order) => order.status === column.key)

          return (
            <section key={column.key} className="flex min-h-[28rem] flex-col rounded-[1.75rem] border border-border bg-card shadow-sm">
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

                    return (
                      <article key={order.id} className="rounded-[1.35rem] border border-border bg-secondary/35 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-card-foreground">#{order.orderNumber}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{order.customerName}</p>
                          </div>
                          <Badge variant="outline">{order.fulfillmentType === "pickup" ? "Pickup" : "Delivery"}</Badge>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                          <p>Sucursal: {order.branchName}</p>
                          <p>Items: {order.itemCount}</p>
                          <p>Total: $ {order.totalAmount.toFixed(2)}</p>
                          <p>Fecha: {new Date(order.placedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
                          <p>Notas: {order.notes || "Sin notas"}</p>
                        </div>

                        {nextStatus && nextLabel ? (
                          <Button className="mt-4 w-full rounded-xl" disabled={isPending} onClick={() => handleStatusChange(order.id, nextStatus)}>
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
