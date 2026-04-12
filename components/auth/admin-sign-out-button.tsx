"use client"

import * as React from "react"
import { LoaderCircle, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"

type AdminSignOutButtonProps = {
  readonly className?: string
  readonly label?: string
}

export function AdminSignOutButton({
  className,
  label = "Cerrar sesion",
}: AdminSignOutButtonProps) {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = React.useState(false)

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()

    if (!supabase) {
      router.replace("/auth/admin/login")
      router.refresh()
      return
    }

    setIsSigningOut(true)
    await supabase.auth.signOut()
    router.replace("/auth/admin/login")
    router.refresh()
  }

  return (
    <Button variant="outline" className={className} onClick={handleSignOut} disabled={isSigningOut}>
      {isSigningOut ? <LoaderCircle className="animate-spin" /> : <LogOut />}
      {isSigningOut ? "Cerrando..." : label}
    </Button>
  )
}
