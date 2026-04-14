import { redirect } from "next/navigation"

import { AdminOnboardingForm } from "@/components/admin/admin-onboarding-form"
import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { requireAdminAccess } from "@/lib/auth/admin"
import { getTenantOnboardingStateBySlug } from "@/lib/services/tenant-onboarding"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type AdminOnboardingPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminOnboardingPage({ params }: AdminOnboardingPageProps) {
  const { tenantSlug } = await params
  const access = await requireAdminAccess(tenantSlug)

  if (access.membership.role !== "owner") {
    redirect(`/app/${tenantSlug}/admin/overview`)
  }

  if (access.tenant.onboardingCompletedAt) {
    redirect(`/app/${tenantSlug}/admin/overview`)
  }

  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const state = await getTenantOnboardingStateBySlug(supabase, tenantSlug)

  if (!state) {
    throw new Error("No pudimos cargar el estado de onboarding del tenant.")
  }

  return (
    <AdminPageShell
      eyebrow="Onboarding"
      title="Activa tu negocio"
      description="Este es el primer paso para entrar al panel operativo. Confirma la identidad comercial del tenant y la sucursal principal para arrancar con una base consistente."
      badge="Paso inicial"
    >
      <AdminOnboardingForm
        tenantSlug={tenantSlug}
        initialBusinessName={state.tenantName}
        initialPrimaryBranchName={state.primaryBranchName ?? "Principal"}
      />
    </AdminPageShell>
  )
}
