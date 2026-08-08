"use client"

import * as React from "react"
import { Clock3, Plus, Save, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { updateBranchScheduleAction } from "@/app/app/[tenantSlug]/admin/branches/actions"
import type { BranchOrderingMode, BranchScheduleExceptionMode } from "@/lib/domain/branch-schedule"
import { WEEKDAY_LABELS } from "@/lib/domain/branch-schedule"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type WeeklyWindowFormValue = {
  readonly id: string
  readonly dayOfWeek: number
  readonly opensAtLocal: string
  readonly closesAtLocal: string
  readonly isActive: boolean
}

type ExceptionWindowFormValue = {
  readonly id: string
  readonly opensAtLocal: string
  readonly closesAtLocal: string
  readonly isActive: boolean
}

type ExceptionFormValue = {
  readonly id: string
  readonly exceptionDate: string
  readonly mode: BranchScheduleExceptionMode
  readonly label: string
  readonly isActive: boolean
  readonly windows: readonly ExceptionWindowFormValue[]
}

type BranchScheduleFormValue = {
  readonly orderingMode: BranchOrderingMode
  readonly weeklyWindows: readonly WeeklyWindowFormValue[]
  readonly exceptions: readonly ExceptionFormValue[]
}

type AdminBranchScheduleEditorProps = {
  readonly tenantSlug: string
  readonly branch: {
    readonly id: string
    readonly name: string
    readonly orderingMode: BranchOrderingMode
    readonly weeklyWindows: readonly {
      readonly id: string
      readonly dayOfWeek: number
      readonly opensAtLocal: string
      readonly closesAtLocal: string
      readonly isActive: boolean
    }[]
    readonly exceptions: readonly {
      readonly id: string
      readonly exceptionDate: string
      readonly mode: BranchScheduleExceptionMode
      readonly label: string | null
      readonly isActive: boolean
      readonly windows: readonly {
        readonly id: string
        readonly opensAtLocal: string
        readonly closesAtLocal: string
        readonly isActive: boolean
      }[]
    }[]
    readonly isOpenNow: boolean
    readonly acceptingOrders: boolean
    readonly closureLabel: string | null
    readonly nextTransitionLabel: string | null
  }
}

function buildFormValue(branch: AdminBranchScheduleEditorProps["branch"]): BranchScheduleFormValue {
  return {
    orderingMode: branch.orderingMode,
    weeklyWindows: branch.weeklyWindows.map((window) => ({
      id: window.id,
      dayOfWeek: window.dayOfWeek,
      opensAtLocal: window.opensAtLocal.slice(0, 5),
      closesAtLocal: window.closesAtLocal.slice(0, 5),
      isActive: window.isActive,
    })),
    exceptions: branch.exceptions.map((exception) => ({
      id: exception.id,
      exceptionDate: exception.exceptionDate,
      mode: exception.mode,
      label: exception.label ?? "",
      isActive: exception.isActive,
      windows: exception.windows.map((window) => ({
        id: window.id,
        opensAtLocal: window.opensAtLocal.slice(0, 5),
        closesAtLocal: window.closesAtLocal.slice(0, 5),
        isActive: window.isActive,
      })),
    })),
  }
}

export function AdminBranchScheduleEditor({ tenantSlug, branch }: AdminBranchScheduleEditorProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isSaving, startSaving] = React.useTransition()
  const [formValue, setFormValue] = React.useState<BranchScheduleFormValue>(() => buildFormValue(branch))

  React.useEffect(() => {
    if (open) {
      setFormValue(buildFormValue(branch))
      setErrorMessage("")
      setSuccessMessage("")
    }
  }, [branch, open])

  function updateWeeklyWindow(windowId: string, field: keyof Omit<WeeklyWindowFormValue, "id" | "dayOfWeek">, value: string | boolean) {
    setFormValue((current) => ({
      ...current,
      weeklyWindows: current.weeklyWindows.map((window) => (window.id === windowId ? { ...window, [field]: value } : window)),
    }))
  }

  function addWeeklyWindow(dayOfWeek: number) {
    setFormValue((current) => ({
      ...current,
      weeklyWindows: [
        ...current.weeklyWindows,
        {
          id: `draft-weekly-${dayOfWeek}-${crypto.randomUUID()}`,
          dayOfWeek,
          opensAtLocal: "09:00",
          closesAtLocal: "18:00",
          isActive: true,
        },
      ],
    }))
  }

  function removeWeeklyWindow(windowId: string) {
    setFormValue((current) => ({
      ...current,
      weeklyWindows: current.weeklyWindows.filter((window) => window.id !== windowId),
    }))
  }

  function addException() {
    setFormValue((current) => ({
      ...current,
      exceptions: [
        ...current.exceptions,
        {
          id: `draft-exception-${crypto.randomUUID()}`,
          exceptionDate: "",
          mode: "force_closed",
          label: "",
          isActive: true,
          windows: [],
        },
      ],
    }))
  }

  function updateException(exceptionId: string, field: keyof Omit<ExceptionFormValue, "id" | "windows">, value: string | boolean) {
    setFormValue((current) => ({
      ...current,
      exceptions: current.exceptions.map((exception) => {
        if (exception.id !== exceptionId) {
          return exception
        }

        const nextException = { ...exception, [field]: value }

        if (field === "mode" && value === "force_closed") {
          return { ...nextException, windows: [] }
        }

        return nextException
      }),
    }))
  }

  function removeException(exceptionId: string) {
    setFormValue((current) => ({
      ...current,
      exceptions: current.exceptions.filter((exception) => exception.id !== exceptionId),
    }))
  }

  function addExceptionWindow(exceptionId: string) {
    setFormValue((current) => ({
      ...current,
      exceptions: current.exceptions.map((exception) =>
        exception.id === exceptionId
          ? {
              ...exception,
              windows: [
                ...exception.windows,
                {
                  id: `draft-exception-window-${crypto.randomUUID()}`,
                  opensAtLocal: "09:00",
                  closesAtLocal: "18:00",
                  isActive: true,
                },
              ],
            }
          : exception
      ),
    }))
  }

  function updateExceptionWindow(exceptionId: string, windowId: string, field: keyof Omit<ExceptionWindowFormValue, "id">, value: string | boolean) {
    setFormValue((current) => ({
      ...current,
      exceptions: current.exceptions.map((exception) =>
        exception.id === exceptionId
          ? {
              ...exception,
              windows: exception.windows.map((window) => (window.id === windowId ? { ...window, [field]: value } : window)),
            }
          : exception
      ),
    }))
  }

  function removeExceptionWindow(exceptionId: string, windowId: string) {
    setFormValue((current) => ({
      ...current,
      exceptions: current.exceptions.map((exception) =>
        exception.id === exceptionId
          ? {
              ...exception,
              windows: exception.windows.filter((window) => window.id !== windowId),
            }
          : exception
      ),
    }))
  }

  function handleSave() {
    setErrorMessage("")
    setSuccessMessage("")

    startSaving(async () => {
      const formData = new FormData()
      formData.set(
        "schedule",
        JSON.stringify({
          orderingMode: formValue.orderingMode,
          weeklyWindows: formValue.weeklyWindows.map((window, index) => ({
            dayOfWeek: window.dayOfWeek,
            opensAtLocal: window.opensAtLocal,
            closesAtLocal: window.closesAtLocal,
            sortOrder: index,
            isActive: window.isActive,
          })),
          exceptions: formValue.exceptions.map((exception, exceptionIndex) => ({
            exceptionDate: exception.exceptionDate,
            mode: exception.mode,
            label: exception.label,
            isActive: exception.isActive,
            sortOrder: exceptionIndex,
            windows: exception.windows.map((window, windowIndex) => ({
              opensAtLocal: window.opensAtLocal,
              closesAtLocal: window.closesAtLocal,
              sortOrder: windowIndex,
              isActive: window.isActive,
            })),
          })),
        })
      )

      const result = await updateBranchScheduleAction(tenantSlug, branch.id, formData)

      if (!result.ok) {
        setErrorMessage(result.error ?? "No pudimos guardar el horario operativo.")
        return
      }

      setSuccessMessage("Horario operativo actualizado.")
      router.refresh()
    })
  }

  return (
    <>
      <Button className="h-8 rounded-lg px-3 text-sm" onClick={() => setOpen(true)} type="button" variant="outline">
        <Clock3 />
        Configurar horario
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-[1.25rem] p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle>Horario operativo de {branch.name}</DialogTitle>
            <DialogDescription>
              Usa la zona fija de Venezuela. El modo manual puede forzar la sucursal abierta o cerrada sin tocar el horario semanal.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={branch.acceptingOrders ? "success" : "warning"}>{branch.acceptingOrders ? "Aceptando pedidos" : "Cerrada"}</Badge>
              <Badge variant="outline">Modo actual: {branch.orderingMode}</Badge>
              {branch.nextTransitionLabel ? <Badge variant="secondary">{branch.nextTransitionLabel}</Badge> : null}
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-card-foreground">Modo operativo</span>
              <select
                className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={formValue.orderingMode}
                onChange={(event) => setFormValue((current) => ({ ...current, orderingMode: event.target.value as BranchOrderingMode }))}
              >
                <option value="force_open">Forzar abierta</option>
                <option value="auto">Horario automatico</option>
                <option value="force_closed">Forzar cerrada</option>
              </select>
            </label>

            <div className="grid gap-3 rounded-[1rem] border border-border p-4">
              <div>
                <p className="text-sm font-semibold text-card-foreground">Horario semanal</p>
                <p className="mt-1 text-xs text-muted-foreground">Puedes definir multiples ventanas por dia y tambien ventanas que crucen medianoche.</p>
              </div>

              <div className="grid gap-3">
                {WEEKDAY_LABELS.map((dayLabel, dayOfWeek) => {
                  const dayWindows = formValue.weeklyWindows.filter((window) => window.dayOfWeek === dayOfWeek)

                  return (
                    <div key={dayLabel} className="rounded-[0.9rem] border border-border bg-secondary/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-card-foreground">{dayLabel}</p>
                        <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-sm" onClick={() => addWeeklyWindow(dayOfWeek)}>
                          <Plus />
                          Agregar ventana
                        </Button>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {dayWindows.length > 0 ? (
                          dayWindows.map((window) => (
                            <div key={window.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
                              <label className="grid gap-2 text-sm">
                                <span className="font-medium text-card-foreground">Abre</span>
                                <Input type="time" value={window.opensAtLocal} onChange={(event) => updateWeeklyWindow(window.id, "opensAtLocal", event.target.value)} />
                              </label>
                              <label className="grid gap-2 text-sm">
                                <span className="font-medium text-card-foreground">Cierra</span>
                                <Input type="time" value={window.closesAtLocal} onChange={(event) => updateWeeklyWindow(window.id, "closesAtLocal", event.target.value)} />
                              </label>
                              <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeWeeklyWindow(window.id)}>
                                <Trash2 />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">Sin ventanas configuradas para este dia.</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3 rounded-[1rem] border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">Excepciones por fecha</p>
                  <p className="mt-1 text-xs text-muted-foreground">Usalas para feriados, mantenimiento o horarios especiales por un dia.</p>
                </div>
                <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-sm" onClick={addException}>
                  <Plus />
                  Agregar excepcion
                </Button>
              </div>

              <div className="grid gap-3">
                {formValue.exceptions.length > 0 ? (
                  formValue.exceptions.map((exception) => (
                    <div key={exception.id} className="rounded-[0.9rem] border border-border bg-secondary/20 p-3">
                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_auto] md:items-end">
                        <label className="grid gap-2 text-sm">
                          <span className="font-medium text-card-foreground">Fecha</span>
                          <Input type="date" value={exception.exceptionDate} onChange={(event) => updateException(exception.id, "exceptionDate", event.target.value)} />
                        </label>
                        <label className="grid gap-2 text-sm">
                          <span className="font-medium text-card-foreground">Modo</span>
                          <select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" value={exception.mode} onChange={(event) => updateException(exception.id, "mode", event.target.value as BranchScheduleExceptionMode)}>
                            <option value="force_closed">Cerrar todo el dia</option>
                            <option value="custom_hours">Horario especial</option>
                          </select>
                        </label>
                        <label className="grid gap-2 text-sm">
                          <span className="font-medium text-card-foreground">Etiqueta</span>
                          <Input value={exception.label} onChange={(event) => updateException(exception.id, "label", event.target.value)} placeholder="Ej. Feriado nacional" />
                        </label>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeException(exception.id)}>
                          <Trash2 />
                        </Button>
                      </div>

                      {exception.mode === "custom_hours" ? (
                        <div className="mt-3 grid gap-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-card-foreground">Ventanas especiales</p>
                            <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-sm" onClick={() => addExceptionWindow(exception.id)}>
                              <Plus />
                              Agregar ventana
                            </Button>
                          </div>

                          {exception.windows.length > 0 ? (
                            exception.windows.map((window) => (
                              <div key={window.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
                                <label className="grid gap-2 text-sm">
                                  <span className="font-medium text-card-foreground">Abre</span>
                                  <Input type="time" value={window.opensAtLocal} onChange={(event) => updateExceptionWindow(exception.id, window.id, "opensAtLocal", event.target.value)} />
                                </label>
                                <label className="grid gap-2 text-sm">
                                  <span className="font-medium text-card-foreground">Cierra</span>
                                  <Input type="time" value={window.closesAtLocal} onChange={(event) => updateExceptionWindow(exception.id, window.id, "closesAtLocal", event.target.value)} />
                                </label>
                                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeExceptionWindow(exception.id, window.id)}>
                                  <Trash2 />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">Agrega al menos una ventana para este horario especial.</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No hay excepciones configuradas.</p>
                )}
              </div>
            </div>

            {errorMessage ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p> : null}
            {successMessage ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{successMessage}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-8 rounded-lg px-3 text-sm" onClick={() => setOpen(false)} disabled={isSaving}>
              Cerrar
            </Button>
            <Button className="h-8 rounded-lg px-3 text-sm" onClick={handleSave} disabled={isSaving}>
              <Save />
              Guardar horario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
