"use client"

import * as React from "react"
import { KeyRound, LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type PasswordResetFormProps = {
  readonly nextPath: string
  readonly cardTitle: string
  readonly initialLoadingMessage: string
  readonly readyMessage: string
  readonly submitLabel: string
}

function readHashParams() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash

  return new URLSearchParams(hash)
}

export function PasswordResetForm({
  nextPath,
  cardTitle,
  initialLoadingMessage,
  readyMessage,
  submitLabel,
}: PasswordResetFormProps) {
  const router = useRouter()
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [infoMessage, setInfoMessage] = React.useState(initialLoadingMessage)
  const [isReady, setIsReady] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    let isMounted = true

    async function bootstrapSession() {
      const supabase = createSupabaseBrowserClient()

      if (!supabase) {
        if (isMounted) {
          setErrorMessage("Supabase no esta configurado en este entorno.")
          setInfoMessage("")
        }
        return
      }

      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get("code")

      if (code) {
        const exchangeResult = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeResult.error) {
          if (isMounted) {
            setErrorMessage(exchangeResult.error.message)
            setInfoMessage("")
          }
          return
        }
      } else {
        const hashParams = readHashParams()
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")

        if (accessToken && refreshToken) {
          const sessionResult = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionResult.error) {
            if (isMounted) {
              setErrorMessage(sessionResult.error.message)
              setInfoMessage("")
            }
            return
          }
        }
      }

      const sessionResult = await supabase.auth.getSession()

      if (!sessionResult.data.session) {
        if (isMounted) {
          setErrorMessage("No pudimos validar tu acceso. Solicita un enlace nuevo.")
          setInfoMessage("")
        }
        return
      }

      if (window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
      }

      if (isMounted) {
        setIsReady(true)
        setInfoMessage(readyMessage)
      }
    }

    void bootstrapSession()

    return () => {
      isMounted = false
    }
  }, [initialLoadingMessage, readyMessage])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")

    if (password.length < 8) {
      setErrorMessage("La contrasena debe tener al menos 8 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contrasenas no coinciden.")
      return
    }

    const supabase = createSupabaseBrowserClient()

    if (!supabase) {
      setErrorMessage("Supabase no esta configurado en este entorno.")
      return
    }

    setIsSubmitting(true)

    const updateResult = await supabase.auth.updateUser({
      password,
    })

    if (updateResult.error) {
      setErrorMessage(updateResult.error.message)
      setIsSubmitting(false)
      return
    }

    await supabase.auth.signOut()

    router.replace(nextPath)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md border-stone-200 shadow-[0_20px_70px_rgba(28,25,23,0.08)]">
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
        <CardDescription>{errorMessage ? "Necesitamos completar tu acceso antes de entrar." : infoMessage}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Nueva contrasena</span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimo 8 caracteres" disabled={!isReady || isSubmitting} required />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-card-foreground">Confirmar contrasena</span>
            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repite tu contrasena" disabled={!isReady || isSubmitting} required />
          </label>

          {errorMessage ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}

          <Button className="mt-2 h-10 rounded-xl" type="submit" disabled={!isReady || isSubmitting}>
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
            {submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
