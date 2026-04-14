"use client"

import * as React from "react"
import { CheckCircle2, Copy, LoaderCircle, Rocket, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { provisionBusinessSignupAction, updateBusinessSignupDecisionAction } from "@/app/platform/signups/actions"
import { Button } from "@/components/ui/button"

import type { BusinessSignupStatus } from "@/lib/domain/platform-admin"

type PlatformSignupRowActionsProps = {
  readonly signupId: string
  readonly status: BusinessSignupStatus
  readonly provisionedTenantId: string | null
  readonly provisionedTenantSlug: string | null
}

export function PlatformSignupRowActions({
  signupId,
  status,
  provisionedTenantId,
  provisionedTenantSlug,
}: PlatformSignupRowActionsProps) {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = React.useState("")
  const [feedbackMessage, setFeedbackMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  function handleDecision(nextDecision: "approved" | "rejected") {
    setErrorMessage("")
    setFeedbackMessage("")

    startTransition(async () => {
      const result = await updateBusinessSignupDecisionAction(signupId, nextDecision)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos actualizar la solicitud.")
        return
      }

      router.refresh()
    })
  }

  function handleProvision() {
    setErrorMessage("")
    setFeedbackMessage("")

    startTransition(async () => {
      const result = await provisionBusinessSignupAction(signupId)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos provisionar el tenant.")
        return
      }

      if (result.delivery === "console" && result.invitationUrl) {
        try {
          await navigator.clipboard.writeText(result.invitationUrl)
          setFeedbackMessage("Tenant provisionado. El link de acceso del owner fue copiado al portapapeles.")
        } catch {
          setFeedbackMessage("Tenant provisionado. Revisa el servidor para obtener el link de acceso del owner.")
        }
      } else {
        setFeedbackMessage(`Tenant provisionado: ${result.tenantSlug}`)
      }

      router.refresh()
    })
  }

  if (status === "pending") {
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

  if (status === "approved" && !provisionedTenantId) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button size="sm" disabled={isPending} onClick={handleProvision}>
          {isPending ? <LoaderCircle className="animate-spin" /> : <Rocket />}
          Provisionar tenant
        </Button>
        {feedbackMessage ? <p className="max-w-80 text-right text-xs text-emerald-700">{feedbackMessage}</p> : null}
        {errorMessage ? <p className="max-w-80 text-right text-xs text-destructive">{errorMessage}</p> : null}
      </div>
    )
  }

  if (status === "provisioned" && provisionedTenantId && provisionedTenantSlug) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/app/${provisionedTenantSlug}/admin/onboarding`}>
            <Copy />
            Abrir panel
          </Link>
        </Button>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <Copy className="size-3.5" />
          Provisionado
        </div>
      </div>
    )
  }

  return null
}
