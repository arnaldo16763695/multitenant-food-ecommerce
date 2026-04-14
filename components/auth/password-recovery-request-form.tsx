"use client"

import * as React from "react"
import Link from "next/link"
import { LoaderCircle, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type PasswordRecoveryActionResult = {
  readonly ok: boolean
  readonly delivery?: "resend" | "console" | "none"
  readonly error?: string
}

type PasswordRecoveryRequestFormProps = {
  readonly title: string
  readonly description: string
  readonly submitLabel: string
  readonly successMessage: string
  readonly backHref: string
  readonly backLabel: string
  readonly submitAction: (payload: { email: string }) => Promise<PasswordRecoveryActionResult>
}

export function PasswordRecoveryRequestForm({
  title,
  description,
  submitLabel,
  successMessage,
  backHref,
  backLabel,
  submitAction,
}: PasswordRecoveryRequestFormProps) {
  const [email, setEmail] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successState, setSuccessState] = React.useState<PasswordRecoveryActionResult | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")
    setSuccessState(null)
    setIsSubmitting(true)

    const result = await submitAction({
      email,
    })

    if (!result.ok) {
      setErrorMessage(result.error ?? "No pudimos procesar tu solicitud.")
      setIsSubmitting(false)
      return
    }

    setSuccessState(result)
    setIsSubmitting(false)
  }

  return (
    <Card className="w-full max-w-md border-stone-200 shadow-[0_20px_70px_rgba(28,25,23,0.08)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Email</span>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" required />
          </label>

          {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}

          {successState ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
              {successState.delivery === "console" ? " No hay proveedor de email configurado; revisa la consola del servidor." : ""}
            </p>
          ) : null}

          <Button className="mt-2 h-10 rounded-xl" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Mail />}
            {submitLabel}
          </Button>

          <Link className="text-center text-sm font-semibold text-orange-700 hover:underline" href={backHref}>
            {backLabel}
          </Link>
        </form>
      </CardContent>
    </Card>
  )
}
