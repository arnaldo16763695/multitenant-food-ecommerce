"use client"

import * as React from "react"
import { Pencil, Plus, Star, Trash2 } from "lucide-react"

import { deleteCustomerAddressAction, setDefaultCustomerAddressAction } from "@/app/app/[tenantSlug]/account/addresses/actions"
import type { CustomerAddress } from "@/lib/domain/customer-address"
import { CustomerAddressForm } from "@/components/account/customer-address-form"
import { Button } from "@/components/ui/button"
import { useToastStore } from "@/lib/ui/toast-store"

type CustomerAddressesViewProps = {
  readonly initialAddresses: readonly CustomerAddress[]
}

function formatAddressLine(address: CustomerAddress) {
  return [address.addressLine1, address.addressLine2, address.city, address.state].filter(Boolean).join(" · ")
}

export function CustomerAddressesView({ initialAddresses }: CustomerAddressesViewProps) {
  const [addresses, setAddresses] = React.useState<readonly CustomerAddress[]>(initialAddresses)
  const [formMode, setFormMode] = React.useState<"closed" | "create" | string>("closed")
  const [pendingActionId, setPendingActionId] = React.useState<string | null>(null)
  const pushToast = useToastStore((state) => state.pushToast)

  function handleSaved(address: CustomerAddress) {
    setAddresses((current) => {
      const withoutSaved = current.filter((item) => item.id !== address.id)
      const nextDefaultCleared = address.isDefault ? withoutSaved.map((item) => ({ ...item, isDefault: false })) : withoutSaved
      return [address, ...nextDefaultCleared]
    })
    setFormMode("closed")
    pushToast({ title: "Dirección guardada", description: address.label, variant: "success" })
  }

  async function handleDelete(addressId: string) {
    setPendingActionId(addressId)
    const previousAddresses = addresses
    setAddresses((current) => current.filter((item) => item.id !== addressId))

    const result = await deleteCustomerAddressAction(addressId)

    if (!result.ok) {
      setAddresses(previousAddresses)
      pushToast({ title: "No pudimos eliminar la dirección", description: result.error ?? "Intenta nuevamente.", variant: "error" })
    }

    setPendingActionId(null)
  }

  async function handleSetDefault(addressId: string) {
    setPendingActionId(addressId)
    const previousAddresses = addresses
    setAddresses((current) => current.map((item) => ({ ...item, isDefault: item.id === addressId })))

    const result = await setDefaultCustomerAddressAction(addressId)

    if (!result.ok) {
      setAddresses(previousAddresses)
      pushToast({ title: "No pudimos actualizar la dirección", description: result.error ?? "Intenta nuevamente.", variant: "error" })
    }

    setPendingActionId(null)
  }

  return (
    <div className="mt-6 space-y-4">
      {addresses.length === 0 && formMode === "closed" ? (
        <div className="rounded-[1.5rem] border border-dashed border-stone-300 px-6 py-10 text-center text-sm text-stone-600">
          Aún no tienes direcciones guardadas.
        </div>
      ) : null}

      {addresses.map((address) =>
        formMode === address.id ? (
          <CustomerAddressForm key={address.id} initialAddress={address} onSaved={handleSaved} onCancel={() => setFormMode("closed")} />
        ) : (
          <article key={address.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-stone-950">{address.label}</p>
                  {address.isDefault ? <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">Predeterminada</span> : null}
                  {!address.hasCoordinates ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Sin ubicación para delivery</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-stone-600">{formatAddressLine(address)}</p>
                {address.deliveryNotes ? <p className="mt-1 text-xs text-stone-500">{address.deliveryNotes}</p> : null}
              </div>
              <div className="flex items-center gap-1">
                {!address.isDefault ? (
                  <Button variant="ghost" size="icon-sm" disabled={pendingActionId === address.id} onClick={() => void handleSetDefault(address.id)} title="Hacer predeterminada">
                    <Star />
                  </Button>
                ) : null}
                <Button variant="ghost" size="icon-sm" onClick={() => setFormMode(address.id)} title="Editar">
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" disabled={pendingActionId === address.id} onClick={() => void handleDelete(address.id)} title="Eliminar">
                  <Trash2 />
                </Button>
              </div>
            </div>
          </article>
        )
      )}

      {formMode === "create" ? (
        <CustomerAddressForm onSaved={handleSaved} onCancel={() => setFormMode("closed")} />
      ) : (
        <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => setFormMode("create")}>
          <Plus />
          Agregar dirección
        </Button>
      )}
    </div>
  )
}
