"use client"

import * as React from "react"
import { LoaderCircle, LogIn } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getDefaultRouteForRole } from "@/lib/auth/permissions"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type AdminLoginFormProps = {
  readonly nextPath?: string
  readonly reason?: string
}

type ProfileLookupRow = {
  id: string
}

type MembershipLookupRow = {
  tenant_id: string
  role: string
}

type TenantLookupRow = {
  slug: string
  onboarding_completed_at: string | null
}

type PlatformMembershipLookupRow = {
  role: string
}

export function AdminLoginForm({ nextPath, reason }: AdminLoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function resolveFallbackRoute() {
    const supabase = createSupabaseBrowserClient()

    if (!supabase) {
      return "/auth/admin/login"
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      return "/auth/admin/login"
    }

    const profileResult = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .limit(1)
      .maybeSingle<ProfileLookupRow>()

    if (profileResult.error || !profileResult.data) {
      return "/auth/admin/login"
    }

    const platformMembershipResult = await supabase
      .from("platform_memberships")
      .select("role")
      .eq("profile_id", profileResult.data.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle<PlatformMembershipLookupRow>()

    if (platformMembershipResult.data && !platformMembershipResult.error) {
      return "/platform"
    }

    const membershipResult = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("profile_id", profileResult.data.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle<MembershipLookupRow>()

    if (membershipResult.error || !membershipResult.data) {
      return "/auth/admin/login"
    }

    const tenantResult = await supabase
      .from("tenants")
      .select("slug, onboarding_completed_at")
      .eq("id", membershipResult.data.tenant_id)
      .limit(1)
      .maybeSingle<TenantLookupRow>()

    if (tenantResult.error || !tenantResult.data) {
      return "/auth/admin/login"
    }

    if (membershipResult.data.role === "owner" && !tenantResult.data.onboarding_completed_at) {
      return `/app/${tenantResult.data.slug}/admin/onboarding`
    }

    return getDefaultRouteForRole(tenantResult.data.slug, membershipResult.data.role)
  }

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

    const destination = nextPath ?? (await resolveFallbackRoute())

    router.replace(destination)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md border-stone-200 shadow-[0_20px_70px_rgba(28,25,23,0.08)]">
      <CardHeader>
        <CardTitle>Acceso admin</CardTitle>
        <CardDescription>
          Inicia sesion con un usuario que tenga membership activa en el tenant.{" "}
          {reason === "membership" ? "No encontramos acceso para este tenant." : null}
          {reason === "password-set" ? "La contrasena fue creada correctamente. Ya puedes entrar." : null}
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
