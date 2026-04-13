"use client"

import * as React from "react"
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

import { updateBusinessSignupDecisionAction } from "@/app/platform/signups/actions"
import { Button } from "@/components/ui/button"

import type { BusinessSignupStatus } from "@/lib/domain/platform-admin"

type PlatformSignupRowActionsProps = {
  readonly signupId: string
  readonly status: BusinessSignupStatus
}

export function PlatformSignupRowActions({ signupId, status }: PlatformSignupRowActionsProps) {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  if (status !== "pending") {
    return null
  }

  function handleDecision(nextDecision: "approved" | "rejected") {
    setErrorMessage("")

    startTransition(async () => {
      const result = await updateBusinessSignupDecisionAction(signupId, nextDecision)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos actualizar la solicitud.")
        return
      }

      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleDecision("rejected")}>
          {isPending ? <LoaderCircle className="animate-spin" /> : <XCircle />}
          Rechazar
        </Button>
        <Button size="sm" disabled={isPending} onClick={() => handleDecision("approved")}>
          {isPending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
          Aprobar
        </Button>
      </div>
      {errorMessage ? <p className="max-w-72 text-right text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  )
}
