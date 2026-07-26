"use client"

import * as React from "react"
import Link from "next/link"
import { Mail, PencilLine, Search, Shield, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  createStaffMemberAction,
  setStaffMemberActiveStateAction,
  updateStaffMemberAction,
} from "@/app/app/[tenantSlug]/admin/staff/actions"
import {
  formatStaffRole,
  isManageableStaffRole,
  MANAGEABLE_STAFF_ROLES,
  type AdminStaffMember,
  type ManageableStaffRole,
  type StaffBranchOption,
} from "@/lib/domain/staff"
import type { AdminAuditEvent } from "@/lib/services/audit"

import { AdminPageShell } from "@/components/admin/admin-page-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type StaffDialogMode = "create" | "edit"

type StaffFormValues = {
  readonly fullName: string
  readonly email: string
  readonly role: ManageableStaffRole
  readonly isActive: boolean
  readonly branchIds: readonly string[]
}

type AdminStaffManagementProps = {
  readonly tenantSlug: string
  readonly initialStaff: readonly AdminStaffMember[]
  readonly initialAuditEvents: readonly AdminAuditEvent[]
  readonly branches: readonly StaffBranchOption[]
  readonly canManage: boolean
}

function buildEmptyStaffForm(): StaffFormValues {
  return {
    fullName: "",
    email: "",
    role: "preparer",
    isActive: true,
    branchIds: [],
  }
}

function buildStaffFormFromMember(member: AdminStaffMember): StaffFormValues {
  return {
    fullName: member.fullName,
    email: member.email,
    role: isManageableStaffRole(member.role) ? member.role : "preparer",
    isActive: member.isActive,
    branchIds: member.branches.filter((branch) => branch.isActive).map((branch) => branch.branchId),
  }
}

function formatBranchSummary(member: AdminStaffMember) {
  const activeBranches = member.branches.filter((branch) => branch.isActive)

  if (!activeBranches.length) {
    return "Sin sucursales activas"
  }

  return activeBranches.map((branch) => branch.branchName).join(", ")
}

function SaveStaffButton({
  isSaving,
  mode,
  onClick,
}: {
  readonly isSaving: boolean
  readonly mode: StaffDialogMode
  readonly onClick: () => void
}) {
  return (
    <Button disabled={isSaving} onClick={onClick}>
      {isSaving ? "Guardando..." : mode === "create" ? "Crear acceso" : "Guardar cambios"}
    </Button>
  )
}

export function AdminStaffManagement({
  tenantSlug,
  initialStaff,
  initialAuditEvents,
  branches,
  canManage,
}: AdminStaffManagementProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [dialogMode, setDialogMode] = React.useState<StaffDialogMode>("create")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<AdminStaffMember | null>(null)
  const [formValues, setFormValues] = React.useState<StaffFormValues>(buildEmptyStaffForm)
  const [feedbackMessage, setFeedbackMessage] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isSaving, startSaving] = React.useTransition()
  const [isUpdatingState, startUpdatingState] = React.useTransition()

  const filteredStaff = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return initialStaff
    }

    return initialStaff.filter((member) => {
      return (
        member.fullName.toLowerCase().includes(normalizedQuery) ||
        member.email.toLowerCase().includes(normalizedQuery) ||
        formatStaffRole(member.role).toLowerCase().includes(normalizedQuery)
      )
    })
  }, [initialStaff, searchQuery])

  const auditEventsByMembership = React.useMemo(() => {
    return initialAuditEvents.reduce<Map<string, AdminAuditEvent[]>>((map, event) => {
      const currentEvents = map.get(event.entityId) ?? []
      map.set(event.entityId, [...currentEvents, event])
      return map
    }, new Map())
  }, [initialAuditEvents])

  const recentAuditEvents = React.useMemo(() => initialAuditEvents.slice(0, 12), [initialAuditEvents])

  function resetDialogState() {
    setSelectedMember(null)
    setFormValues(buildEmptyStaffForm())
    setErrorMessage("")
  }

  function openCreateDialog() {
    resetDialogState()
    setDialogMode("create")
    setIsDialogOpen(true)
  }

  function openEditDialog(member: AdminStaffMember) {
    setSelectedMember(member)
    setFormValues(buildStaffFormFromMember(member))
    setDialogMode("edit")
    setErrorMessage("")
    setIsDialogOpen(true)
  }

  function updateField<K extends keyof StaffFormValues>(field: K, value: StaffFormValues[K]) {
    setErrorMessage("")
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  function toggleBranch(branchId: string, checked: boolean) {
    updateField(
      "branchIds",
      checked ? [...formValues.branchIds, branchId] : formValues.branchIds.filter((currentBranchId) => currentBranchId !== branchId)
    )
  }

  function saveStaffMember() {
    if (!canManage) {
      setErrorMessage("No tienes permisos para gestionar staff en este tenant.")
      return
    }

    startSaving(async () => {
      const formData = new FormData()
      formData.set("fullName", formValues.fullName)
      formData.set("email", formValues.email)
      formData.set("role", formValues.role)
      formData.set("isActive", String(formValues.isActive))

      formValues.branchIds.forEach((branchId) => {
        formData.append("branchIds", branchId)
      })

      const result =
        dialogMode === "create" || !selectedMember
          ? await createStaffMemberAction(tenantSlug, formData)
          : await updateStaffMemberAction(tenantSlug, selectedMember.membershipId, formData)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos guardar el miembro del staff.")
        return
      }

      const deliveryLabel =
        result.delivery === "resend"
          ? "Invitacion enviada por email."
          : result.delivery === "console"
            ? "Acceso generado. Revisa la consola del servidor para ver el link."
            : "Cambios guardados."

      setFeedbackMessage(deliveryLabel)
      setIsDialogOpen(false)
      resetDialogState()
      router.refresh()
    })
  }

  function toggleMemberState(member: AdminStaffMember) {
    if (!canManage || !isManageableStaffRole(member.role)) {
      return
    }

    startUpdatingState(async () => {
      const result = await setStaffMemberActiveStateAction(tenantSlug, member.membershipId, !member.isActive)

      if (!result.ok) {
        setFeedbackMessage(result.error ?? "No pudimos actualizar el estado del staff.")
        return
      }

      setFeedbackMessage(member.isActive ? "Miembro desactivado." : "Miembro reactivado.")
      router.refresh()
    })
  }

  return (
    <AdminPageShell
      eyebrow="Staff"
      title="Equipo operativo del tenant"
      description="Gestiona preparadores, caja y encargados por sucursal sobre la base multitenant actual de perfiles, membresias y asignaciones de branch."
      badge={`${initialStaff.length} miembros`}
      density="compact"
    >
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle>Miembros del staff</CardTitle>
            <CardDescription>Alta, activacion y asignacion operativa por sucursal para cocina y operacion diaria.</CardDescription>
            <div className="relative mt-3 max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-8 pl-9"
                placeholder="Buscar por nombre, email o rol"
              />
            </div>
          </div>
          <Button className="h-8 rounded-lg px-3 text-sm" onClick={openCreateDialog} disabled={!canManage}>
            <UserPlus />
            Nuevo staff
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {feedbackMessage ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedbackMessage}</div>
          ) : null}

          {!canManage ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Solo owner y manager pueden crear o modificar staff desde este modulo.
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[1rem] border border-border">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="h-10 px-3 text-xs">Persona</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Rol</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Sucursales</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Estado</TableHead>
                  <TableHead className="h-10 w-[190px] px-3 text-right text-xs">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => {
                  const canEditMember = canManage && isManageableStaffRole(member.role)

                  return (
                    <TableRow key={member.membershipId}>
                       <TableCell className="px-3 py-2">
                          <div className="space-y-1">
                            <p className="font-semibold text-card-foreground">{member.fullName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="size-3.5" />
                              <span>{member.email}</span>
                            </div>
                            {auditEventsByMembership.get(member.membershipId)?.[0] ? (
                              <p className="text-xs text-muted-foreground">Ultimo cambio: {auditEventsByMembership.get(member.membershipId)?.[0]?.summary}</p>
                            ) : null}
                          </div>
                        </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge variant={member.role === "preparer" ? "warning" : member.role === "cashier" ? "secondary" : "outline"}>
                          {formatStaffRole(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-muted-foreground">{formatBranchSummary(member)}</TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge variant={member.isActive ? "success" : "outline"}>{member.isActive ? "Activo" : "Inactivo"}</Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          {canEditMember ? (
                            <>
                              <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs" onClick={() => openEditDialog(member)}>
                                <PencilLine />
                                Editar
                              </Button>
                              <Button
                                variant={member.isActive ? "destructive" : "secondary"}
                                size="sm"
                                className="h-8 rounded-lg px-3 text-xs"
                                onClick={() => toggleMemberState(member)}
                                disabled={isUpdatingState}
                              >
                                {member.isActive ? "Desactivar" : "Reactivar"}
                              </Button>
                              <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg px-3 text-xs">
                                <Link href={`/app/${tenantSlug}/admin/audit?entity=staff_member&entityId=${encodeURIComponent(member.membershipId)}`}>
                                  Auditoria
                                </Link>
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                <Shield className="size-3.5" />
                                Protegido
                              </div>
                              <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg px-3 text-xs">
                                <Link href={`/app/${tenantSlug}/admin/audit?entity=staff_member&entityId=${encodeURIComponent(member.membershipId)}`}>
                                  Auditoria
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No encontramos miembros de staff con ese filtro.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Actividad reciente del staff</CardTitle>
          <CardDescription>Resumen de altas, cambios de rol, activaciones y ajustes de sucursal del equipo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {recentAuditEvents.length ? (
            recentAuditEvents.map((event) => (
              <div key={event.id} className="rounded-[0.95rem] border border-border bg-secondary/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{event.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.actorName ?? "Sistema"} · {event.actorRole ?? "Sin rol"}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs">
                    <Link href={`/app/${tenantSlug}/admin/audit?entity=staff_member&entityId=${encodeURIComponent(event.entityId)}`}>
                      Ver historial
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1rem] border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              Todavia no hay eventos auditados de staff.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[min(92vw,760px)]">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Nuevo miembro del staff" : "Editar miembro del staff"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Crea el acceso del operador y asigna en que sucursales puede trabajar."
                : "Ajusta rol, estado y sucursales del operador sin borrar su identidad global."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 px-6 pb-6">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="staff-full-name">
                  Nombre completo
                </label>
                <Input
                  id="staff-full-name"
                  value={formValues.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                  placeholder="Pedro Perez"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="staff-email">
                  Email
                </label>
                <Input
                  id="staff-email"
                  type="email"
                  value={formValues.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="pedro@empresa.com"
                  disabled={dialogMode === "edit"}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="staff-role">
                  Rol operativo
                </label>
                <select
                  id="staff-role"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={formValues.role}
                  onChange={(event) => updateField("role", event.target.value as ManageableStaffRole)}
                >
                  {MANAGEABLE_STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {formatStaffRole(role)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Estado del acceso</p>
                <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                  <Checkbox checked={formValues.isActive} onCheckedChange={(checked) => updateField("isActive", checked === true)} />
                  Acceso activo para operar
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Sucursales asignadas</p>
                <p className="mt-1 text-sm text-muted-foreground">La cocina y los pedidos visibles dependeran de estas asignaciones de branch.</p>
              </div>

              <div className="grid gap-2.5 md:grid-cols-2">
                {branches.map((branch) => {
                  const checked = formValues.branchIds.includes(branch.id)

                  return (
                    <label
                      key={branch.id}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                        checked ? "border-orange-300 bg-orange-50/60" : "border-border bg-background"
                      } ${!branch.isActive ? "opacity-60" : ""}`}
                    >
                      <Checkbox checked={checked} onCheckedChange={(nextChecked) => toggleBranch(branch.id, nextChecked === true)} />
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{branch.name}</p>
                        <p className="text-muted-foreground">{branch.isActive ? "Sucursal activa" : "Sucursal pausada"}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {errorMessage ? <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorMessage}</div> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-8 rounded-lg px-3 text-sm" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <SaveStaffButton isSaving={isSaving} mode={dialogMode} onClick={saveStaffMember} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
