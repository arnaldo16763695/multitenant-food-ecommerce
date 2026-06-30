"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { CheckCircle2, Copy, LoaderCircle, ShoppingBag, Upload } from "lucide-react"

import type { CustomerAccountContext } from "@/lib/auth/customer"
import type { ShoppingBagItem } from "@/lib/domain/bag"
import { formatManualPaymentMethod, type ManualPaymentMethod, type TenantManualPaymentSettings } from "@/lib/domain/order"
import { useHydrateShoppingBagBranch, useShoppingBagItems, useShoppingBagStore, useShoppingBagSubtotal } from "@/lib/storefront/bag-store"

import { StorefrontHeader } from "@/components/marketing/storefront-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type StorefrontCheckoutViewProps = {
  readonly tenantSlug: string
  readonly branchId: string | null
  readonly branchLabel: string
  readonly customerDefaults?: {
    fullName?: string | null
    email?: string | null
    phone?: string | null
  }
  readonly manualPaymentSettings?: TenantManualPaymentSettings | null
  readonly customerSession?: Pick<CustomerAccountContext, "user" | "customer"> | null
  readonly initialBagItems?: readonly ShoppingBagItem[]
}

type AvailableManualPaymentMethod = {
  readonly key: ManualPaymentMethod
  readonly title: string
  readonly instructions: string
}

export function StorefrontCheckoutView({ tenantSlug, branchId, branchLabel, customerDefaults, manualPaymentSettings, customerSession, initialBagItems = [] }: StorefrontCheckoutViewProps) {
  const activeBranchId = branchId ?? ""
  const fulfillmentType = "pickup"
  const items = useShoppingBagItems(tenantSlug, activeBranchId, initialBagItems)
  const subtotal = useShoppingBagSubtotal(tenantSlug, activeBranchId, initialBagItems)
  const clearBranchBag = useShoppingBagStore((state) => state.clearBranchBag)
  useHydrateShoppingBagBranch(tenantSlug, activeBranchId, initialBagItems)
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
  const [fullName, setFullName] = React.useState(customerDefaults?.fullName ?? "")
  const [email, setEmail] = React.useState(customerDefaults?.email ?? "")
  const [phone, setPhone] = React.useState(customerDefaults?.phone ?? "")
  const [notes, setNotes] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<ManualPaymentMethod | null>(availablePaymentMethods[0]?.key ?? null)
  const [paymentProofFile, setPaymentProofFile] = React.useState<File | null>(null)
  const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = React.useState<string | null>(null)
  const [copySuccess, setCopySuccess] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const menuHref = branchId ? `/app/${tenantSlug}?branch=${branchId}` : `/app/${tenantSlug}`
  const primaryStorefrontButtonClassName =
    "border-orange-600 bg-orange-600 text-white hover:bg-orange-500 hover:text-white disabled:border-stone-300 disabled:bg-stone-300 disabled:text-stone-500"
  const selectedPaymentMethod = React.useMemo(
    () => availablePaymentMethods.find((method) => method.key === paymentMethod) ?? null,
    [availablePaymentMethods, paymentMethod]
  )

  React.useEffect(() => {
    if (!availablePaymentMethods.length) {
      setPaymentMethod(null)
      return
    }

    if (!paymentMethod || !availablePaymentMethods.some((method) => method.key === paymentMethod)) {
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

  function handlePaymentProofFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setPaymentProofFile(file)
    setErrorMessage("")

    if (paymentProofPreviewUrl) {
      URL.revokeObjectURL(paymentProofPreviewUrl)
    }

    if (!file) {
      setPaymentProofPreviewUrl(null)
      return
    }

    setPaymentProofPreviewUrl(URL.createObjectURL(file))
  }

  async function handleCopyInstructions() {
    if (!selectedPaymentMethod) {
      return
    }

    try {
      await navigator.clipboard.writeText(selectedPaymentMethod.instructions)
      setCopySuccess(`Datos copiados de ${selectedPaymentMethod.title.toLowerCase()}.`)
      window.setTimeout(() => setCopySuccess(""), 2500)
    } catch {
      setCopySuccess("No pudimos copiar los datos automáticamente.")
      window.setTimeout(() => setCopySuccess(""), 2500)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")

    if (!branchId) {
      setErrorMessage("Selecciona una sucursal activa antes de continuar.")
      return
    }

    if (!items.length) {
      setErrorMessage("Tu bolsa esta vacia.")
      return
    }

    if (!selectedPaymentMethod) {
      setErrorMessage("El negocio todavía no configuró métodos de pago para este checkout.")
      return
    }

    if (!paymentProofFile) {
      setErrorMessage("Adjunta el comprobante de pago antes de enviar tu pedido.")
      return
    }

    try {
      setIsSubmitting(true)

      const formData = new FormData()
      formData.set("branchId", branchId)
      formData.set("items", JSON.stringify(items))
      formData.set("fullName", fullName)
      formData.set("email", email)
      formData.set("phone", phone)
      formData.set("notes", notes)
      formData.set("fulfillmentType", fulfillmentType)
      formData.set("paymentMethod", selectedPaymentMethod.key)
      formData.set("paymentProof", paymentProofFile)

      const response = await fetch(`/api/storefront/${tenantSlug}/checkout`, {
        method: "POST",
        body: formData,
      })

      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean
            orderId?: string
            error?: string
          }
        | null

      if (!response.ok || !result?.ok || !result.orderId) {
        setErrorMessage(result?.error ?? "No pudimos registrar tu pedido.")
        setIsSubmitting(false)
        return
      }

      clearBranchBag(tenantSlug, activeBranchId)
      window.location.assign(`/app/${tenantSlug}/orders/${result.orderId}`)
    } catch {
      setErrorMessage("No pudimos completar el checkout. Intenta nuevamente.")
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_26%),linear-gradient(180deg,_#fffaf2_0%,_#fff4e6_40%,_#fffdfa_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(120,53,15,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.07)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <StorefrontHeader
          tenantSlug={tenantSlug}
          brandName="Checkout"
          branchId={branchId}
          branchLabel={branchLabel}
          customerSession={customerSession}
          initialBagCount={initialBagItems.reduce((count, item) => count + item.quantity, 0)}
        />

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[2rem] border-stone-200/80 bg-white/85 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur">
            <CardHeader>
              <CardTitle>Datos para confirmar tu pedido</CardTitle>
              <CardDescription>Este MVP opera solo con pickup. Usamos esta información para confirmar tu pedido y ubicarte si hace falta.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">Flujo de checkout</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1.1rem] bg-stone-50 px-4 py-3 text-sm">
                      <p className="font-semibold text-stone-950">1. Elegir pago</p>
                      <p className="mt-1 leading-6 text-stone-600">Selecciona pago móvil o transferencia.</p>
                    </div>
                    <div className="rounded-[1.1rem] bg-stone-50 px-4 py-3 text-sm">
                      <p className="font-semibold text-stone-950">2. Adjuntar comprobante</p>
                      <p className="mt-1 leading-6 text-stone-600">Sube la imagen antes de enviar el pedido.</p>
                    </div>
                    <div className="rounded-[1.1rem] bg-stone-50 px-4 py-3 text-sm">
                      <p className="font-semibold text-stone-950">3. Esperar validación</p>
                      <p className="mt-1 leading-6 text-stone-600">El negocio revisa pago y luego pasa la orden a cocina.</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 rounded-[1.5rem] border border-orange-200 bg-orange-50/70 p-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">Paso 1. Realiza el pago antes de enviar tu pedido</p>
                    <p className="mt-1 text-sm leading-6 text-stone-600">Elige un método, copia los datos del negocio y luego adjunta la imagen del comprobante.</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {availablePaymentMethods.map((method) => {
                      const isSelected = paymentMethod === method.key

                      return (
                        <button
                          key={method.key}
                          type="button"
                          className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                            isSelected ? "border-orange-500 bg-white shadow-sm" : "border-stone-200 bg-white/80 hover:border-stone-300"
                          }`}
                          onClick={() => setPaymentMethod(method.key)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-950">{method.title}</p>
                              <p className="mt-1 text-sm leading-6 text-stone-600">Pago manual con validación por comprobante.</p>
                            </div>
                            {isSelected ? <CheckCircle2 className="size-5 text-orange-600" /> : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {selectedPaymentMethod ? (
                    <div className="rounded-[1.25rem] border border-stone-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-stone-950">Datos para {selectedPaymentMethod.title.toLowerCase()}</p>
                          <p className="mt-1 text-sm leading-6 text-stone-600 whitespace-pre-wrap">{selectedPaymentMethod.instructions}</p>
                        </div>
                        <Button type="button" variant="outline" className="rounded-full" onClick={() => void handleCopyInstructions()}>
                          <Copy />
                          Copiar datos
                        </Button>
                      </div>
                      {copySuccess ? <p className="mt-3 text-sm text-stone-600">{copySuccess}</p> : null}
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-stone-300 bg-white/80 p-4 text-sm text-stone-600">
                      El negocio todavía no configuró métodos de pago para este checkout.
                    </div>
                  )}

                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-card-foreground">Comprobante de pago</span>
                    <Input accept="image/png,image/jpeg,image/webp" onChange={handlePaymentProofFileChange} type="file" />
                    <span className="text-xs text-stone-500">Acepta JPG, PNG o WEBP de hasta 5 MB.</span>
                  </label>

                  {paymentProofPreviewUrl ? (
                    <div className="rounded-[1.25rem] border border-stone-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-950">
                        <Upload className="size-4" />
                        Vista previa del comprobante
                      </div>
                      <Image
                        alt="Vista previa del comprobante de pago"
                        className="max-h-64 rounded-xl border border-stone-200 object-contain"
                        height={720}
                        src={paymentProofPreviewUrl}
                        unoptimized
                        width={1280}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">Paso 2. Completa tus datos</p>
                    <p className="mt-1 text-sm leading-6 text-stone-600">Usaremos estos datos para identificar tu pedido y contactarte si hace falta.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-card-foreground">Nombre completo</span>
                    <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ej. Ana Torres" required />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-card-foreground">Telefono</span>
                    <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+5215512345678" required />
                  </label>
                  </div>

                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-card-foreground">Email</span>
                    <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@correo.com" />
                  </label>

                  <div className="rounded-[1.25rem] border border-stone-200 bg-white p-4 text-sm text-stone-600">
                    <p className="font-semibold text-stone-950">Entrega del pedido</p>
                    <p className="mt-2 leading-6">Por ahora todos los pedidos se registran como <span className="font-semibold text-stone-950">pickup en sucursal</span>. Delivery queda fuera de este MVP.</p>
                  </div>

                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-card-foreground">Notas</span>
                    <textarea
                      className="min-h-28 rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      placeholder="Ej. sin cebolla, entregar en puerta, etc."
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </label>
                </div>

                <div className="grid gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">Paso 3. Envía tu pedido</p>
                    <p className="mt-1 text-sm leading-6 text-stone-600">Cuando envíes el pedido, tu comprobante y tu orden quedarán pendientes de validación manual.</p>
                  </div>

                  {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}

                  <Button
                    className={`h-10 rounded-full ${primaryStorefrontButtonClassName}`}
                    disabled={isSubmitting || items.length === 0 || !branchId || !selectedPaymentMethod || !paymentProofFile}
                    type="submit"
                  >
                    {isSubmitting ? <LoaderCircle className="animate-spin" /> : <ShoppingBag />}
                    {isSubmitting ? "Procesando pedido..." : "Enviar pedido y comprobante"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-stone-200/80 bg-white/85 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur">
            <CardHeader>
              <CardTitle>Resumen del pedido</CardTitle>
              <CardDescription>Paso a paso de lo que estás por confirmar para recoger en sucursal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {items.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-stone-300 px-6 py-10 text-center text-stone-600">
                  Tu bolsa esta vacia.{" "}
                  <Link className="font-semibold text-stone-950" href={menuHref}>
                    Volver al menu
                  </Link>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rounded-[1.25rem] bg-stone-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-stone-950">{item.name}</p>
                        {item.modifierSelections.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-stone-500">
                            {item.modifierSelections.map((selection) => (
                              <span key={`${selection.modifierGroupId}-${selection.modifierOptionId}`}>
                                {selection.modifierGroupName}: {selection.modifierOptionName}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-1 text-xs text-stone-500">
                          {item.quantity} x {item.unitPriceLabel}
                        </p>
                      </div>
                      <span className="font-semibold text-stone-950">$ {(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}

              <div className="rounded-[1.5rem] bg-stone-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-500">Método de pago</span>
                  <span className="font-semibold text-stone-950">{selectedPaymentMethod ? selectedPaymentMethod.title : "Sin configurar"}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-stone-500">Comprobante</span>
                  <span className="font-semibold text-stone-950">{paymentProofFile ? "Adjuntado" : "Pendiente"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-500">Entrega</span>
                  <span className="font-semibold text-stone-950">Pickup</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-stone-500">Sucursal</span>
                  <span className="font-semibold text-stone-950">{branchLabel}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-stone-500">Validación</span>
                  <span className="font-semibold text-stone-950">Manual</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-stone-500">Subtotal</span>
                  <span className="font-semibold text-stone-950">{subtotal.label}</span>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4 text-stone-600">
                El negocio revisará tu comprobante y tu pedido antes de pasarlo a cocina. Te mostraremos el estado actualizado en la siguiente pantalla.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
