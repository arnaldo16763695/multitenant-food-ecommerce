"use client"

import * as React from "react"

import { setCustomerWhatsappOptInAction } from "@/app/app/[tenantSlug]/account/actions"

type WhatsappOptInToggleProps = {
  readonly tenantSlug: string
  readonly initialOptIn: boolean
}

export function WhatsappOptInToggle({ tenantSlug, initialOptIn }: WhatsappOptInToggleProps) {
  const [optIn, setOptIn] = React.useState(initialOptIn)
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState("")

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.checked
    setOptIn(next)
    setErrorMessage("")

    startTransition(async () => {
      const result = await setCustomerWhatsappOptInAction(tenantSlug, next)

      if (!result.ok) {
        setOptIn(!next)
        setErrorMessage(result.error)
      }
    })
  }

  return (
    <div>
      <label className="flex items-start gap-3 text-sm text-stone-600">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
          checked={optIn}
          onChange={handleChange}
          disabled={isPending}
        />
        <span>
          <span className="font-semibold text-stone-950">Avisos por WhatsApp</span>
          <span className="mt-1 block text-stone-600">
            Recibe un mensaje cuando confirmamos, dejamos listo o cancelamos tu pedido, o cuando hay
            que revisar tu comprobante.
          </span>
        </span>
      </label>
      {errorMessage ? <p className="mt-2 text-sm text-red-600">{errorMessage}</p> : null}
    </div>
  )
}
