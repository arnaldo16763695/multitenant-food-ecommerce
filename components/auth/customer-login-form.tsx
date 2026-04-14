"use client"

import * as React from "react"
import Link from "next/link"
import { LoaderCircle, LogIn } from "lucide-react"
import { useRouter } from "next/navigation"

import { resendCustomerConfirmationAction } from "@/app/app/[tenantSlug]/account/register/actions"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type CustomerLoginFormProps = {
  readonly tenantSlug: string
  readonly reason?: string
}

export function CustomerLoginForm({ tenantSlug, reason }: CustomerLoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
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

    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (result.error) {
      if (result.error.message.toLowerCase().includes("email not confirmed")) {
        const resendResult = await resendCustomerConfirmationAction({
          tenantSlug,
          email,
        })

        setErrorMessage("Tu email aun no esta confirmado.")
        setSuccessMessage(
          resendResult.ok
            ? resendResult.delivery === "resend"
              ? "Te reenviamos un link de activacion a tu correo."
              : "No hay proveedor de email configurado todavia, asi que el link de activacion se imprimio en consola del servidor."
            : resendResult.error ?? "No pudimos reenviar el link de activacion."
        )
      } else {
        setErrorMessage(result.error.message)
      }
      setIsSubmitting(false)
      return
    }

    router.replace(`/app/${tenantSlug}/account`)
    router.refresh()
  }

  return (
    <Card className="rounded-[2rem] border-stone-200/80 bg-white/90 shadow-[0_18px_50px_rgba(120,53,15,0.08)] backdrop-blur">
      <CardHeader>
        <CardTitle>Iniciar sesion</CardTitle>
        <CardDescription>
          Accede a tu cuenta para ver pedidos, direcciones guardadas y seguir comprando mas rapido.{" "}
          {reason === "password-reset" ? "Tu password fue actualizado correctamente. Ya puedes entrar." : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Email</span>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@correo.com" required />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Password</span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu password" required />
          </label>

          <Link className="text-right text-sm font-semibold text-orange-700 hover:underline" href={`/app/${tenantSlug}/account/forgot-password`}>
            Olvide mi password
          </Link>

          {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
          {successMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}

          <Button className="mt-2 h-10 rounded-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <LogIn />}
            Entrar a mi cuenta
          </Button>

          <p className="text-center text-sm text-stone-600">
            Aun no tienes cuenta?{" "}
            <Link className="font-semibold text-stone-950" href={`/app/${tenantSlug}/account/register`}>
              Registrate aqui
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
