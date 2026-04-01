"use client"

import * as React from "react"
import { LoaderCircle, LogIn } from "lucide-react"
import { useRouter } from "next/navigation"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type AdminLoginFormProps = {
  readonly nextPath?: string
  readonly reason?: string
}

export function AdminLoginForm({ nextPath = "/brands", reason }: AdminLoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")

    const supabase = createSupabaseBrowserClient()

    if (!supabase) {
      setErrorMessage("Supabase no esta configurado en este entorno.")
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    router.replace(nextPath)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md border-stone-200 shadow-[0_20px_70px_rgba(28,25,23,0.08)]">
      <CardHeader>
        <CardTitle>Acceso admin</CardTitle>
        <CardDescription>
          Inicia sesion con un usuario que tenga membership activa en el tenant. {reason === "membership" ? "No encontramos acceso para este tenant." : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Email</span>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@demo-brand.com" required />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Password</span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu password" required />
          </label>

          {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}

          <Button className="mt-2 h-10 rounded-xl" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <LogIn />}
            Entrar al admin
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
