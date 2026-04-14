"use client"

import * as React from "react"
import Link from "next/link"
import { LoaderCircle } from "lucide-react"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type AdminAuthCallbackProps = {
  readonly nextPath: string
}

function readHashParams() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash

  return new URLSearchParams(hash)
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    }),
  ])
}

export function AdminAuthCallback({ nextPath }: AdminAuthCallbackProps) {
  const [errorMessage, setErrorMessage] = React.useState("")

  React.useEffect(() => {
    let isMounted = true

    async function bootstrapSession() {
      try {
        const supabase = createSupabaseBrowserClient()

        if (!supabase) {
          if (isMounted) {
            setErrorMessage("Supabase no esta configurado en este entorno.")
          }
          return
        }

        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get("code")

        if (code) {
          const exchangeResult = await withTimeout(
            supabase.auth.exchangeCodeForSession(code),
            15000,
            "Se agoto el tiempo al intercambiar el codigo de acceso."
          )

          if (exchangeResult.error) {
            if (isMounted) {
              setErrorMessage(exchangeResult.error.message)
            }
            return
          }
        } else {
          const hashParams = readHashParams()
          const accessToken = hashParams.get("access_token")
          const refreshToken = hashParams.get("refresh_token")

          if (accessToken && refreshToken) {
            const sessionResult = await withTimeout(
              supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              }),
              15000,
              "Se agoto el tiempo al crear la sesion del enlace seguro."
            )

            if (sessionResult.error) {
              if (isMounted) {
                setErrorMessage(sessionResult.error.message)
              }
              return
            }
          }
        }

        const userResult = await withTimeout(
          supabase.auth.getUser(),
          10000,
          "Se agoto el tiempo al validar el usuario autenticado."
        )

        if (!userResult.data.user?.id) {
          if (isMounted) {
            setErrorMessage("No pudimos validar tu acceso. Solicita un enlace nuevo.")
          }
          return
        }

        if (window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
        }

        window.location.replace(nextPath)
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No pudimos completar el acceso con este enlace.")
        }
      }
    }

    void bootstrapSession()

    return () => {
      isMounted = false
    }
  }, [nextPath])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_30%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)] px-6 py-16">
      <div className="grid gap-6 text-center">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-700">VZ Food Admin</p>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950">Validando tu acceso.</h1>
          <p className="mx-auto max-w-xl text-sm leading-7 text-stone-600">
            Estamos terminando de iniciar sesion con tu enlace seguro para llevarte al panel correcto.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-[1.75rem] border border-stone-200 bg-white/90 px-6 py-8 shadow-[0_20px_70px_rgba(28,25,23,0.08)]">
          <LoaderCircle className="size-6 animate-spin text-orange-700" />
          {errorMessage ? (
            <>
              <p className="text-sm text-destructive">{errorMessage}</p>
              <Link className="text-sm font-semibold text-orange-700 hover:underline" href="/auth/admin/login">
                Ir al login admin
              </Link>
            </>
          ) : (
            <p className="text-sm text-stone-600">Creando tu sesion segura...</p>
          )}
        </div>
      </div>
    </main>
  )
}
