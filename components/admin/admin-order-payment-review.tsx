"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { rejectManualPaymentAction } from "@/app/app/[tenantSlug]/admin/orders/actions"

import { Button } from "@/components/ui/button"

type AdminOrderPaymentReviewProps = {
  readonly tenantSlug: string
  readonly orderId: string
  readonly paymentStatus: string
  readonly existingReason: string | null
}

export function AdminOrderPaymentReview({ tenantSlug, orderId, paymentStatus, existingReason }: AdminOrderPaymentReviewProps) {
  const router = useRouter()
  const [rejectionReason, setRejectionReason] = React.useState(existingReason ?? "")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  const canReject = paymentStatus === "pending"

  function handleReject() {
    setErrorMessage("")
    setSuccessMessage("")

    startTransition(async () => {
      const result = await rejectManualPaymentAction(tenantSlug, orderId, rejectionReason)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos rechazar el comprobante.")
        return
      }

      setSuccessMessage("Comprobante rechazado con motivo registrado.")
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3 rounded-[1rem] border border-border p-3.5">
      <div>
        <p className="font-semibold text-card-foreground">Revisión del comprobante</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Si el pago no es válido, deja el motivo para que el cliente pueda corregirlo y volver a subir el comprobante.
        </p>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-card-foreground">Motivo del rechazo</span>
        <textarea
          className="min-h-24 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          disabled={!canReject || isPending}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder="Ej. El monto no coincide con la orden o el comprobante no se ve completo."
          value={rejectionReason}
        />
      </label>

      {existingReason ? <p className="text-sm text-muted-foreground">Último motivo registrado: {existingReason}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
      {successMessage ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}

      <div className="flex justify-end">
        <Button className="h-8 rounded-lg px-3 text-sm" disabled={!canReject || isPending} onClick={handleReject} type="button" variant="destructive">
          {isPending ? "Rechazando..." : "Rechazar comprobante"}
        </Button>
      </div>
    </div>
  )
}
