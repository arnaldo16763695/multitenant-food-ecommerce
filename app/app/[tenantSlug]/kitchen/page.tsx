import Link from "next/link"

import { requireKitchenAccess } from "@/lib/auth/admin"
import { getDefaultRouteForRole } from "@/lib/auth/permissions"
import { getKitchenOrders } from "@/lib/services/orders"
import { getKitchenBranchesForMembership } from "@/lib/services/staff"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

import { KitchenBoard } from "@/components/kitchen/kitchen-board"
import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { AdminSignOutButton } from "@/components/auth/admin-sign-out-button"
import { Button } from "@/components/ui/button"
import { KitchenBranchSelector } from "@/components/kitchen/kitchen-branch-selector"
import { OrderRealtimeRefresh } from "@/components/realtime/order-realtime-refresh"

type KitchenPageProps = {
  readonly params: Promise<{
    tenantSlug: string
  }>
  readonly searchParams: Promise<{
    branch?: string
  }>
}

export default async function KitchenPage({ params, searchParams }: KitchenPageProps) {
  const { tenantSlug } = await params
  const { branch: requestedBranchId } = await searchParams
  const access = await requireKitchenAccess(tenantSlug)
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const activeBranches = await getKitchenBranchesForMembership(supabase, access.membership.tenantId, access.membership.id, access.membership.role)
  const branchIds = activeBranches.map((branch) => branch.id)

  const activeBranchId =
    requestedBranchId && branchIds.includes(requestedBranchId)
      ? requestedBranchId
      : activeBranches[0]?.id ?? branchIds[0] ?? ""

  const activeBranch = activeBranches.find((branch) => branch.id === activeBranchId) ?? null
  const orders = await getKitchenOrders(supabase, access.membership.tenantId, activeBranchId ? [activeBranchId] : [])

  // Kitchen lives outside the /admin route tree (no shared sidebar), so a role that also has an
  // admin home -- everyone except preparer -- needs its own way back instead of relying on the
  // browser's back button.
  const adminHomeHref = getDefaultRouteForRole(tenantSlug, access.membership.role)
  const canReturnToAdmin = adminHomeHref !== `/app/${tenantSlug}/kitchen`

  return (
    <AdminPageShell
      eyebrow="Kitchen"
      title="Tablero operativo de cocina"
      description={
        activeBranch
          ? `Kitchen enfocado en ${activeBranch.name}. El tablero opera una sucursal activa por vez para reducir ruido operativo.`
          : "No tienes sucursales activas asignadas para operar kitchen."
      }
      badge={`${orders.length} órdenes activas`}
      actions={
        <>
          {canReturnToAdmin ? (
            <Button asChild variant="outline">
              <Link href={adminHomeHref}>Volver a Admin</Link>
            </Button>
          ) : null}
          {activeBranches.length > 1 ? (
            <KitchenBranchSelector
              activeBranchId={activeBranchId}
              branches={activeBranches.map((branch) => ({
                id: branch.id,
                name: branch.name,
              }))}
            />
          ) : null}
          <AdminSignOutButton label="Cerrar sesion" />
        </>
      }
      density="compact"
    >
      <OrderRealtimeRefresh tenantId={access.membership.tenantId} />
      <KitchenBoard
        tenantSlug={tenantSlug}
        orders={orders}
        currentMembershipId={access.membership.id}
        currentStaffName={access.profile.fullName}
        activeBranchName={activeBranch?.name ?? "Sin sucursal activa"}
      />
    </AdminPageShell>
  )
}
