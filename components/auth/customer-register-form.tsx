"use client"

import * as React from "react"
import { LoaderCircle, UserRoundPlus } from "lucide-react"
import { useRouter } from "next/navigation"

import { provisionCustomerAccountAction } from "@/app/app/[tenantSlug]/account/register/actions"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type CustomerRegisterFormProps = {
  readonly tenantSlug: string
}

export function CustomerRegisterForm({ tenantSlug }: CustomerRegisterFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [marketingOptIn, setMarketingOptIn] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    const supabase = createSupabaseBrowserClient()

    if (!supabase) {
      setErrorMessage("Supabase no esta configurado en este entorno.")
      return
    }

    setIsSubmitting(true)

    const signUpResult = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    })

    if (signUpResult.error || !signUpResult.data.user) {
      setErrorMessage(signUpResult.error?.message ?? "No pudimos crear la cuenta.")
      setIsSubmitting(false)
      return
    }

    const provisionResult = await provisionCustomerAccountAction({
      authUserId: signUpResult.data.user.id,
      email,
      fullName,
      phone,
      marketingOptIn,
    })

    if (!provisionResult.ok) {
      setErrorMessage(provisionResult.error ?? "No pudimos completar el registro del cliente.")
      setIsSubmitting(false)
      return
    }

    setSuccessMessage("Cuenta creada. Si tu proyecto requiere confirmacion de email, revisa tu correo para activar el acceso.")
    setIsSubmitting(false)

    if (signUpResult.data.session) {
      router.replace(`/app/${tenantSlug}/account`)
      router.refresh()
    }
  }

  return (
    <Card className="rounded-[2rem] border-stone-200/80 bg-white/90 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur">
      <CardHeader>
        <CardTitle>Crear cuenta de cliente</CardTitle>
        <CardDescription>Tu cuenta funcionará para esta marca y para futuras compras dentro de la plataforma.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Nombre completo</span>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ej. Ana Torres" required />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Email</span>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@correo.com" required />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Telefono</span>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+5215512345678" required />
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Password</span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Crea una password segura" required />
          </label>

          <label className="flex items-start gap-3 rounded-[1.1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
            <input checked={marketingOptIn} className="mt-1" onChange={(event) => setMarketingOptIn(event.target.checked)} type="checkbox" />
            <span>Quiero recibir novedades, promociones y recordatorios de pedido.</span>
          </label>

          {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
          {successMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}

          <Button className="mt-2 h-10 rounded-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <UserRoundPlus />}
            Crear cuenta
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
