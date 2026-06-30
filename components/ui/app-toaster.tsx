"use client"

import * as React from "react"
import { CheckCircle2, CircleAlert, X } from "lucide-react"

import { useToastStore } from "@/lib/ui/toast-store"
import { Button } from "@/components/ui/button"

const TOAST_LIFETIME_MS = 2600

export function AppToaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismissToast = useToastStore((state) => state.dismissToast)

  React.useEffect(() => {
    if (toasts.length === 0) {
      return
    }

    const timeouts = toasts.map((toast) =>
      window.setTimeout(() => {
        dismissToast(toast.id)
      }, TOAST_LIFETIME_MS)
    )

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout))
    }
  }, [dismissToast, toasts])

  return (
    <div className="pointer-events-none fixed inset-x-4 top-24 z-[100] flex flex-col items-end gap-3 sm:inset-x-auto sm:top-28 sm:right-4 sm:left-auto sm:w-full sm:max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-full items-start gap-3 rounded-[1.2rem] border px-4 py-3 shadow-[0_18px_40px_rgba(28,25,23,0.12)] backdrop-blur ${
            toast.variant === "success"
              ? "border-emerald-200 bg-emerald-50/95 text-emerald-950"
              : "border-destructive/20 bg-white text-stone-950"
          }`}
        >
          {toast.variant === "success" ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          ) : (
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.description ? <p className="mt-1 text-sm leading-6 text-stone-600">{toast.description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="icon-sm" className="-mr-2 -mt-1 shrink-0" onClick={() => dismissToast(toast.id)}>
            <X />
            <span className="sr-only">Cerrar</span>
          </Button>
        </div>
      ))}
    </div>
  )
}
