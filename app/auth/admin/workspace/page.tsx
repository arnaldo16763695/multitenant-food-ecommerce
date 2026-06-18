import { redirect } from "next/navigation"

import { AdminWorkspaceSelector } from "@/components/auth/admin-workspace-selector"
import { getAdminWorkspaceOptions } from "@/lib/auth/admin-workspaces"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function AdminWorkspacePage() {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    redirect("/auth/admin/login")
  }

  const options = await getAdminWorkspaceOptions(supabase, user.id)

  if (options.length === 0) {
    redirect("/auth/admin/login?reason=membership")
  }

  if (options.length === 1) {
    redirect(options[0].href)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_30%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)] px-6 py-16">
      <div className="grid w-full max-w-3xl gap-6">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-700">Workspace</p>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950">Elige a qué panel quieres entrar.</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-stone-600">Esta cuenta tiene acceso a más de un contexto operativo. Selecciona el workspace correcto para continuar.</p>
        </div>
        <AdminWorkspaceSelector options={options} />
      </div>
    </main>
  )
}
