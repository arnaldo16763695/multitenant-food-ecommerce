"use client"

import * as React from "react"
import { ArrowRight, LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"

import { completeTenantOnboardingAction } from "@/app/app/[tenantSlug]/admin/onboarding/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type AdminOnboardingFormProps = {
  readonly tenantSlug: string
  readonly initialBusinessName: string
  readonly initialPrimaryBranchName: string
}

export function AdminOnboardingForm({
  tenantSlug,
  initialBusinessName,
  initialPrimaryBranchName,
}: AdminOnboardingFormProps) {
  const router = useRouter()
  const [businessName, setBusinessName] = React.useState(initialBusinessName)
  const [primaryBranchName, setPrimaryBranchName] = React.useState(initialPrimaryBranchName)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")

    startTransition(async () => {
      const formData = new FormData()
      formData.set("businessName", businessName)
      formData.set("primaryBranchName", primaryBranchName)

      const result = await completeTenantOnboardingAction(tenantSlug, formData)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos completar el onboarding.")
        return
      }

      router.replace(`/app/${result.tenantSlug ?? tenantSlug}/admin/overview`)
      router.refresh()
    })
  }

  return (
    <Card className="max-w-3xl border-stone-200 bg-white/90 shadow-[0_18px_50px_rgba(28,25,23,0.08)]">
      <CardHeader>
        <CardTitle>Configuracion inicial del negocio</CardTitle>
        <CardDescription>
          Antes de entrar al panel completo, confirma el nombre comercial y la sucursal principal con la que arrancara la operacion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Nombre del negocio</span>
            <Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Ej. Demo Brand" required />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Sucursal principal</span>
            <Input value={primaryBranchName} onChange={(event) => setPrimaryBranchName(event.target.value)} placeholder="Ej. Centro" required />
          </label>

          {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}

          <div className="flex justify-end">
            <Button className="rounded-xl" disabled={isPending} type="submit">
              {isPending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
              Finalizar onboarding
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
