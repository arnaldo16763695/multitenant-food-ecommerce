"use client"

import * as React from "react"
import Image from "next/image"
import { CheckCircle2, LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"

import { formatManualPaymentMethod, type ManualPaymentMethod, type TenantManualPaymentSettings } from "@/lib/domain/order"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type AvailableManualPaymentMethod = {
  readonly key: ManualPaymentMethod
  readonly title: string
  readonly instructions: string
}

type OrderPaymentProofResubmissionProps = {
  readonly tenantSlug: string
  readonly orderId: string
  readonly currentPaymentMethod: ManualPaymentMethod | null
  readonly manualPaymentSettings: TenantManualPaymentSettings | null
}

export function OrderPaymentProofResubmission({ tenantSlug, orderId, currentPaymentMethod, manualPaymentSettings }: OrderPaymentProofResubmissionProps) {
  const router = useRouter()
  const availablePaymentMethods = React.useMemo<readonly AvailableManualPaymentMethod[]>(() => {
    const methods: AvailableManualPaymentMethod[] = []

    if (manualPaymentSettings?.mobilePaymentInstructions?.trim()) {
      methods.push({
        key: "mobile_payment",
        title: formatManualPaymentMethod("mobile_payment"),
        instructions: manualPaymentSettings.mobilePaymentInstructions.trim(),
      })
    }

    if (manualPaymentSettings?.bankTransferInstructions?.trim()) {
      methods.push({
        key: "bank_transfer",
        title: formatManualPaymentMethod("bank_transfer"),
        instructions: manualPaymentSettings.bankTransferInstructions.trim(),
      })
    }

    return methods
  }, [manualPaymentSettings])
  const [paymentMethod, setPaymentMethod] = React.useState<ManualPaymentMethod | null>(currentPaymentMethod)
  const [paymentProofFile, setPaymentProofFile] = React.useState<File | null>(null)
  const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    if (!paymentMethod && availablePaymentMethods[0]) {
      setPaymentMethod(availablePaymentMethods[0].key)
    }
  }, [availablePaymentMethods, paymentMethod])

  React.useEffect(() => {
    return () => {
      if (paymentProofPreviewUrl) {
        URL.revokeObjectURL(paymentProofPreviewUrl)
      }
    }
  }, [paymentProofPreviewUrl])

  const selectedPaymentMethod = availablePaymentMethods.find((method) => method.key === paymentMethod) ?? null

  function handlePaymentProofFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setPaymentProofFile(file)
    setErrorMessage("")
    setSuccessMessage("")

    if (paymentProofPreviewUrl) {
      URL.revokeObjectURL(paymentProofPreviewUrl)
    }

    if (!file) {
      setPaymentProofPreviewUrl(null)
      return
    }

    setPaymentProofPreviewUrl(URL.createObjectURL(file))
  }

  function submitReplacement() {
    if (!selectedPaymentMethod) {
      setErrorMessage("El negocio no tiene métodos de pago disponibles en este momento.")
      return
    }

    if (!paymentProofFile) {
      setErrorMessage("Adjunta el nuevo comprobante antes de continuar.")
      return
    }

    setErrorMessage("")
    setSuccessMessage("")

    startTransition(async () => {
      const formData = new FormData()
      formData.set("paymentMethod", selectedPaymentMethod.key)
      formData.set("paymentProof", paymentProofFile)

      const response = await fetch(`/api/storefront/${tenantSlug}/orders/${orderId}/payment-proof`, {
        method: "POST",
        body: formData,
      })

      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null

      if (!response.ok || !result?.ok) {
        setErrorMessage(result?.error ?? "No pudimos actualizar tu comprobante.")
        return
      }

      setSuccessMessage("Recibimos tu nuevo comprobante. El negocio volverá a revisarlo.")
      setPaymentProofFile(null)
      setPaymentProofPreviewUrl(null)
      router.refresh()
    })
  }

  return (
    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">Corregir comprobante</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-950">Vuelve a subir tu pago</h2>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          El negocio rechazó el comprobante anterior. Corrige el pago y sube una nueva imagen sin recrear la orden.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {availablePaymentMethods.map((method) => {
          const isSelected = paymentMethod === method.key

          return (
            <button
              key={method.key}
              type="button"
              className={`rounded-[1.1rem] border px-4 py-4 text-left transition ${
                isSelected ? "border-orange-500 bg-white shadow-sm" : "border-stone-200 bg-white/85 hover:border-stone-300"
              }`}
              onClick={() => setPaymentMethod(method.key)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-950">{method.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-600">{method.instructions}</p>
                </div>
                {isSelected ? <CheckCircle2 className="size-5 text-orange-600" /> : null}
              </div>
            </button>
          )
        })}
      </div>

      <label className="mt-4 grid gap-2 text-sm">
        <span className="font-medium text-card-foreground">Nuevo comprobante</span>
        <Input accept="image/png,image/jpeg,image/webp" onChange={handlePaymentProofFileChange} type="file" />
      </label>

      {paymentProofPreviewUrl ? (
        <div className="mt-4 rounded-[1rem] border border-stone-200 bg-white p-4">
          <Image alt="Vista previa del nuevo comprobante" className="max-h-64 rounded-[0.9rem] border border-stone-200 object-contain" height={720} src={paymentProofPreviewUrl} unoptimized width={1280} />
        </div>
      ) : null}

      {errorMessage ? <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
      {successMessage ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}

      <div className="mt-4 flex justify-end">
        <Button className="h-9 rounded-full px-5 text-sm" disabled={isPending || !selectedPaymentMethod || !paymentProofFile} onClick={submitReplacement} type="button">
          {isPending ? <LoaderCircle className="animate-spin" /> : null}
          {isPending ? "Actualizando comprobante..." : "Enviar nuevo comprobante"}
        </Button>
      </div>
    </div>
  )
}
