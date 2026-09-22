"use client"

import * as React from "react"

import { createCustomerAddressAction, updateCustomerAddressAction } from "@/app/app/[tenantSlug]/account/addresses/actions"
import type { CustomerAddress } from "@/lib/domain/customer-address"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type GeolocationStatus = "idle" | "loading" | "success" | "denied" | "unsupported"

type CustomerAddressFormProps = {
  readonly initialAddress?: CustomerAddress | null
  readonly onSaved: (address: CustomerAddress) => void
  readonly onCancel: () => void
}

export function CustomerAddressForm({ initialAddress = null, onSaved, onCancel }: CustomerAddressFormProps) {
  const [label, setLabel] = React.useState(initialAddress?.label ?? "")
  const [addressLine1, setAddressLine1] = React.useState(initialAddress?.addressLine1 ?? "")
  const [addressLine2, setAddressLine2] = React.useState(initialAddress?.addressLine2 ?? "")
  const [city, setCity] = React.useState(initialAddress?.city ?? "")
  const [state, setState] = React.useState(initialAddress?.state ?? "")
  const [postalCode, setPostalCode] = React.useState(initialAddress?.postalCode ?? "")
  const [deliveryNotes, setDeliveryNotes] = React.useState(initialAddress?.deliveryNotes ?? "")
  const [isDefault, setIsDefault] = React.useState(initialAddress?.isDefault ?? false)
  const [coordinates, setCoordinates] = React.useState<{ latitude: number; longitude: number } | null>(
    initialAddress?.latitude != null && initialAddress?.longitude != null ? { latitude: initialAddress.latitude, longitude: initialAddress.longitude } : null
  )
  const [geolocationStatus, setGeolocationStatus] = React.useState<GeolocationStatus>(coordinates ? "success" : "idle")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  function handleShareLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeolocationStatus("unsupported")
      return
    }

    setGeolocationStatus("loading")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude })
        setGeolocationStatus("success")
      },
      () => {
        setGeolocationStatus("denied")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!label.trim()) {
      setErrorMessage("Ponle un nombre a esta dirección, por ejemplo Casa u Oficina.")
      return
    }

    if (!addressLine1.trim()) {
      setErrorMessage("Agrega al menos una calle o avenida para esta dirección.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage("")

    const payload = {
      label: label.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      postalCode: postalCode.trim() || null,
      deliveryNotes: deliveryNotes.trim() || null,
      isDefault,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    }

    const result = initialAddress ? await updateCustomerAddressAction(initialAddress.id, payload) : await createCustomerAddressAction(payload)

    setIsSubmitting(false)

    if (!result.ok || !result.address) {
      setErrorMessage(result.error ?? "No pudimos guardar la dirección.")
      return
    }

    onSaved(result.address)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-[1.4rem] border border-stone-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-600" htmlFor="address-label">
            Nombre de la dirección
          </label>
          <Input id="address-label" placeholder="Casa, oficina..." value={label} onChange={(event) => setLabel(event.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-600" htmlFor="address-line-1">
            Calle y número
          </label>
          <Input id="address-line-1" value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-600" htmlFor="address-line-2">
            Referencias (opcional)
          </label>
          <Input id="address-line-2" placeholder="Depto, entre calles, color de casa..." value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-600" htmlFor="address-city">
            Ciudad
          </label>
          <Input id="address-city" value={city} onChange={(event) => setCity(event.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-600" htmlFor="address-state">
            Estado
          </label>
          <Input id="address-state" value={state} onChange={(event) => setState(event.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-600" htmlFor="address-postal-code">
            Código postal
          </label>
          <Input id="address-postal-code" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-stone-600" htmlFor="address-delivery-notes">
          Notas para el repartidor (opcional)
        </label>
        <Input id="address-delivery-notes" placeholder="Tocar el timbre, dejar con el portero..." value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} />
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
        {geolocationStatus === "success" && coordinates ? (
          <p className="text-sm text-stone-700">
            <span className="font-semibold text-stone-950">Ubicación compartida.</span> Esta dirección puede usarse para delivery.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-stone-600">
              {geolocationStatus === "denied"
                ? "No pudimos acceder a tu ubicación. Sin ella, esta dirección no se puede usar para delivery."
                : geolocationStatus === "unsupported"
                  ? "Tu navegador no permite compartir ubicación. Sin ella, esta dirección no se puede usar para delivery."
                  : "Comparte tu ubicación actual para poder usar esta dirección en pedidos con delivery."}
            </p>
            <Button type="button" variant="outline" size="sm" disabled={geolocationStatus === "loading"} onClick={handleShareLocation}>
              {geolocationStatus === "loading" ? "Obteniendo ubicación..." : geolocationStatus === "denied" || geolocationStatus === "unsupported" ? "Reintentar ubicación" : "Compartir mi ubicación"}
            </Button>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} className="size-4 rounded border-stone-300" />
        Usar como dirección predeterminada
      </label>

      {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}

      <div className="flex items-center gap-2">
        <Button type="submit" className="rounded-full border-orange-600 bg-orange-600 text-white hover:bg-orange-500 hover:text-white" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar dirección"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
