import type { SupabaseClient } from "@supabase/supabase-js"

import {
  BRANCH_SCHEDULE_TIME_ZONE,
  BRANCH_SCHEDULE_UTC_OFFSET_MINUTES,
  type BranchOperatingWindow,
  type BranchOperationalStatus,
  type BranchOrderingMode,
  type BranchScheduleConfig,
  type BranchScheduleException,
  type BranchScheduleExceptionMode,
  type BranchScheduleMutationInput,
  type BranchScheduleExceptionWindow,
  WEEKDAY_LABELS,
} from "@/lib/domain/branch-schedule"
import type { AuditActor } from "@/lib/services/audit"
import { writeAuditEvent } from "@/lib/services/audit"

type BranchOrderingModeRow = {
  id: string
  ordering_mode: BranchOrderingMode
}

type BranchOperatingWindowRow = {
  id: string
  branch_id: string
  day_of_week: number
  opens_at_local: string
  closes_at_local: string
  sort_order: number
  is_active: boolean
}

type BranchScheduleExceptionRow = {
  id: string
  branch_id: string
  exception_date: string
  mode: BranchScheduleExceptionMode
  label: string | null
  is_active: boolean
}

type BranchScheduleExceptionWindowRow = {
  id: string
  exception_id: string
  opens_at_local: string
  closes_at_local: string
  sort_order: number
  is_active: boolean
}

type BranchScheduleUpdateResult = {
  readonly ok: boolean
  readonly error?: string
}

type LocalDateParts = {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly dayOfWeek: number
  readonly hours: number
  readonly minutes: number
}

type ScheduleInterval = {
  readonly startsAt: Date
  readonly endsAt: Date
}

function toLocalDate(date: Date) {
  return new Date(date.getTime() + BRANCH_SCHEDULE_UTC_OFFSET_MINUTES * 60_000)
}

function toUtcDate(year: number, month: number, day: number, hours: number, minutes: number) {
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - BRANCH_SCHEDULE_UTC_OFFSET_MINUTES * 60_000)
}

function getLocalDateParts(date: Date): LocalDateParts {
  const localDate = toLocalDate(date)

  return {
    year: localDate.getUTCFullYear(),
    month: localDate.getUTCMonth() + 1,
    day: localDate.getUTCDate(),
    dayOfWeek: localDate.getUTCDay(),
    hours: localDate.getUTCHours(),
    minutes: localDate.getUTCMinutes(),
  }
}

function padTwoDigits(value: number) {
  return String(value).padStart(2, "0")
}

function formatDateKey(parts: Pick<LocalDateParts, "year" | "month" | "day">) {
  return `${parts.year}-${padTwoDigits(parts.month)}-${padTwoDigits(parts.day)}`
}

function shiftLocalDate(dateKey: string, dayDelta: number) {
  const [year, month, day] = dateKey.split("-").map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + dayDelta, 12, 0, 0))

  return formatDateKey({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  })
}

function getDayOfWeekFromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay()
}

function parseTimeToMinutes(timeValue: string) {
  const [hours, minutes] = timeValue.slice(0, 5).split(":").map(Number)
  return hours * 60 + minutes
}

function formatTimeLabel(timeValue: string) {
  const [hoursValue, minutesValue] = timeValue.slice(0, 5).split(":").map(Number)
  const period = hoursValue >= 12 ? "PM" : "AM"
  const displayHour = hoursValue % 12 || 12
  return `${displayHour}:${padTwoDigits(minutesValue)} ${period}`
}

function formatTransitionLabel(transitionAt: Date) {
  const parts = getLocalDateParts(transitionAt)
  const todayKey = formatDateKey(getLocalDateParts(new Date()))
  const tomorrowKey = shiftLocalDate(todayKey, 1)
  const transitionKey = formatDateKey(parts)
  const timeLabel = formatTimeLabel(`${padTwoDigits(parts.hours)}:${padTwoDigits(parts.minutes)}`)

  if (transitionKey === todayKey) {
    return `Hoy a las ${timeLabel}`
  }

  if (transitionKey === tomorrowKey) {
    return `Manana a las ${timeLabel}`
  }

  return `${WEEKDAY_LABELS[parts.dayOfWeek]} a las ${timeLabel}`
}

function mapWeeklyWindow(row: BranchOperatingWindowRow): BranchOperatingWindow {
  return {
    id: row.id,
    branchId: row.branch_id,
    dayOfWeek: row.day_of_week,
    opensAtLocal: row.opens_at_local,
    closesAtLocal: row.closes_at_local,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }
}

function mapExceptionWindow(row: BranchScheduleExceptionWindowRow): BranchScheduleExceptionWindow {
  return {
    id: row.id,
    exceptionId: row.exception_id,
    opensAtLocal: row.opens_at_local,
    closesAtLocal: row.closes_at_local,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }
}

function getWindowsForDate(config: BranchScheduleConfig, dateKey: string): readonly { opensAtLocal: string; closesAtLocal: string }[] {
  const exception = config.exceptions.find((entry) => entry.isActive && entry.exceptionDate === dateKey)

  if (exception) {
    if (exception.mode === "force_closed") {
      return []
    }

    return exception.windows
      .filter((window) => window.isActive)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((window) => ({ opensAtLocal: window.opensAtLocal, closesAtLocal: window.closesAtLocal }))
  }

  const dayOfWeek = getDayOfWeekFromDateKey(dateKey)

  return config.weeklyWindows
    .filter((window) => window.isActive && window.dayOfWeek === dayOfWeek)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((window) => ({ opensAtLocal: window.opensAtLocal, closesAtLocal: window.closesAtLocal }))
}

function buildIntervalsForDate(config: BranchScheduleConfig, dateKey: string): readonly ScheduleInterval[] {
  const [year, month, day] = dateKey.split("-").map(Number)

  return getWindowsForDate(config, dateKey).map((window) => {
    const [opensHours, opensMinutes] = window.opensAtLocal.slice(0, 5).split(":").map(Number)
    const [closesHours, closesMinutes] = window.closesAtLocal.slice(0, 5).split(":").map(Number)
    const opensMinutesTotal = parseTimeToMinutes(window.opensAtLocal)
    const closesMinutesTotal = parseTimeToMinutes(window.closesAtLocal)
    const crossesMidnight = closesMinutesTotal < opensMinutesTotal
    const startsAt = toUtcDate(year, month, day, opensHours, opensMinutes)
    const endsAt = crossesMidnight ? toUtcDate(year, month, day + 1, closesHours, closesMinutes) : toUtcDate(year, month, day, closesHours, closesMinutes)

    return { startsAt, endsAt }
  })
}

function getExceptionClosureLabel(config: BranchScheduleConfig, dateKey: string) {
  const exception = config.exceptions.find((entry) => entry.isActive && entry.exceptionDate === dateKey && entry.mode === "force_closed")
  return exception?.label ?? null
}

export function resolveBranchOperationalStatus(config: BranchScheduleConfig, now = new Date()): BranchOperationalStatus {
  if (config.orderingMode === "force_open") {
    return {
      isOpenNow: true,
      acceptingOrders: true,
      orderingMode: config.orderingMode,
      closureLabel: null,
      nextTransitionAt: null,
      nextTransitionLabel: null,
    }
  }

  if (config.orderingMode === "force_closed") {
    return {
      isOpenNow: false,
      acceptingOrders: false,
      orderingMode: config.orderingMode,
      closureLabel: "Sucursal cerrada temporalmente.",
      nextTransitionAt: null,
      nextTransitionLabel: null,
    }
  }

  const currentDateKey = formatDateKey(getLocalDateParts(now))
  const previousDateKey = shiftLocalDate(currentDateKey, -1)
  const relevantIntervals = [...buildIntervalsForDate(config, previousDateKey), ...buildIntervalsForDate(config, currentDateKey)]
  const currentInterval = relevantIntervals.find((interval) => now >= interval.startsAt && now < interval.endsAt) ?? null

  const futureIntervals: ScheduleInterval[] = []

  for (let dayOffset = -1; dayOffset <= 8; dayOffset += 1) {
    futureIntervals.push(...buildIntervalsForDate(config, shiftLocalDate(currentDateKey, dayOffset)))
  }

  futureIntervals.sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())

  if (currentInterval) {
    return {
      isOpenNow: true,
      acceptingOrders: true,
      orderingMode: config.orderingMode,
      closureLabel: null,
      nextTransitionAt: currentInterval.endsAt.toISOString(),
      nextTransitionLabel: `Cierra ${formatTransitionLabel(currentInterval.endsAt)}`,
    }
  }

  const nextInterval = futureIntervals.find((interval) => interval.startsAt > now) ?? null
  const closureLabel = getExceptionClosureLabel(config, currentDateKey) ?? "Sucursal cerrada por horario."

  return {
    isOpenNow: false,
    acceptingOrders: false,
    orderingMode: config.orderingMode,
    closureLabel,
    nextTransitionAt: nextInterval?.startsAt.toISOString() ?? null,
    nextTransitionLabel: nextInterval ? `Abre ${formatTransitionLabel(nextInterval.startsAt)}` : null,
  }
}

export async function getBranchScheduleConfigs(
  supabase: SupabaseClient,
  branchIds: readonly string[]
): Promise<ReadonlyMap<string, BranchScheduleConfig>> {
  if (!branchIds.length) {
    return new Map()
  }

  const [branchesResult, weeklyWindowsResult, exceptionsResult, exceptionWindowsResult] = await Promise.all([
    supabase.from("branches").select("id, ordering_mode").in("id", [...branchIds]).returns<BranchOrderingModeRow[]>(),
    supabase
      .from("branch_operating_windows")
      .select("id, branch_id, day_of_week, opens_at_local, closes_at_local, sort_order, is_active")
      .in("branch_id", [...branchIds])
      .returns<BranchOperatingWindowRow[]>(),
    supabase
      .from("branch_schedule_exceptions")
      .select("id, branch_id, exception_date, mode, label, is_active")
      .in("branch_id", [...branchIds])
      .returns<BranchScheduleExceptionRow[]>(),
    supabase
      .from("branch_schedule_exception_windows")
      .select("id, exception_id, opens_at_local, closes_at_local, sort_order, is_active")
      .returns<BranchScheduleExceptionWindowRow[]>(),
  ])

  if (branchesResult.error || weeklyWindowsResult.error || exceptionsResult.error || exceptionWindowsResult.error) {
    throw new Error(
      branchesResult.error?.message ??
        weeklyWindowsResult.error?.message ??
        exceptionsResult.error?.message ??
        exceptionWindowsResult.error?.message ??
        "No pudimos cargar el horario operativo de las sucursales."
    )
  }

  const exceptionWindowsMap = (exceptionWindowsResult.data ?? []).reduce<Map<string, BranchScheduleExceptionWindow[]>>((map, row) => {
    const current = map.get(row.exception_id) ?? []
    map.set(row.exception_id, [...current, mapExceptionWindow(row)])
    return map
  }, new Map())

  const exceptionsMap = (exceptionsResult.data ?? []).reduce<Map<string, BranchScheduleException[]>>((map, row) => {
    const current = map.get(row.branch_id) ?? []
    map.set(row.branch_id, [
      ...current,
      {
        id: row.id,
        branchId: row.branch_id,
        exceptionDate: row.exception_date,
        mode: row.mode,
        label: row.label,
        isActive: row.is_active,
        windows: (exceptionWindowsMap.get(row.id) ?? []).sort((left, right) => left.sortOrder - right.sortOrder),
      },
    ])
    return map
  }, new Map())

  const weeklyWindowsMap = (weeklyWindowsResult.data ?? []).reduce<Map<string, BranchOperatingWindow[]>>((map, row) => {
    const current = map.get(row.branch_id) ?? []
    map.set(row.branch_id, [...current, mapWeeklyWindow(row)])
    return map
  }, new Map())

  return new Map(
    (branchesResult.data ?? []).map((branch) => [
      branch.id,
      {
        branchId: branch.id,
        orderingMode: branch.ordering_mode,
        weeklyWindows: (weeklyWindowsMap.get(branch.id) ?? []).sort((left, right) => left.sortOrder - right.sortOrder),
        exceptions: (exceptionsMap.get(branch.id) ?? []).sort((left, right) => left.exceptionDate.localeCompare(right.exceptionDate)),
      },
    ])
  )
}

export async function getBranchOperationalStatusMap(supabase: SupabaseClient, branchIds: readonly string[], now = new Date()) {
  const configMap = await getBranchScheduleConfigs(supabase, branchIds)

  return new Map(
    [...configMap.entries()].map(([branchId, config]) => [branchId, resolveBranchOperationalStatus(config, now)])
  )
}

function isValidTimeValue(value: string) {
  return /^\d{2}:\d{2}$/.test(value)
}

function normalizeScheduleMutationInput(input: BranchScheduleMutationInput) {
  const weeklyWindows = input.weeklyWindows
    .map((window) => ({
      id: window.id,
      dayOfWeek: window.dayOfWeek,
      opensAtLocal: window.opensAtLocal.trim(),
      closesAtLocal: window.closesAtLocal.trim(),
      sortOrder: window.sortOrder,
      isActive: window.isActive,
    }))
    .filter((window) => window.isActive)

  const exceptions = input.exceptions
    .map((exception) => ({
      id: exception.id,
      exceptionDate: exception.exceptionDate.trim(),
      mode: exception.mode,
      label: exception.label?.trim() || null,
      isActive: exception.isActive,
      windows: exception.windows
        .map((window) => ({
          id: window.id,
          opensAtLocal: window.opensAtLocal.trim(),
          closesAtLocal: window.closesAtLocal.trim(),
          sortOrder: window.sortOrder,
          isActive: window.isActive,
        }))
        .filter((window) => window.isActive),
    }))
    .filter((exception) => exception.isActive)

  for (const window of weeklyWindows) {
    if (window.dayOfWeek < 0 || window.dayOfWeek > 6) {
      return { ok: false as const, error: "Cada ventana semanal debe indicar un dia valido." }
    }

    if (!isValidTimeValue(window.opensAtLocal) || !isValidTimeValue(window.closesAtLocal) || window.opensAtLocal === window.closesAtLocal) {
      return { ok: false as const, error: "Cada ventana semanal debe indicar horas validas y distintas." }
    }
  }

  for (const exception of exceptions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.exceptionDate)) {
      return { ok: false as const, error: "Cada excepcion debe guardar una fecha valida." }
    }

    if (exception.mode === "custom_hours" && !exception.windows.length) {
      return { ok: false as const, error: "Las excepciones con horario especial deben incluir al menos una ventana." }
    }

    if (exception.mode === "force_closed" && exception.windows.length > 0) {
      return { ok: false as const, error: "Las excepciones cerradas no pueden incluir ventanas." }
    }

    for (const window of exception.windows) {
      if (!isValidTimeValue(window.opensAtLocal) || !isValidTimeValue(window.closesAtLocal) || window.opensAtLocal === window.closesAtLocal) {
        return { ok: false as const, error: "Cada ventana especial debe indicar horas validas y distintas." }
      }
    }
  }

  return { ok: true as const, weeklyWindows, exceptions }
}

export async function updateBranchSchedule(
  supabase: SupabaseClient,
  tenantId: string,
  branchId: string,
  input: BranchScheduleMutationInput,
  auditActor?: AuditActor
): Promise<BranchScheduleUpdateResult> {
  const normalizedInput = normalizeScheduleMutationInput(input)

  if (!normalizedInput.ok) {
    return { ok: false, error: normalizedInput.error }
  }

  const branchResult = await supabase
    .from("branches")
    .update({ ordering_mode: input.orderingMode })
    .eq("id", branchId)
    .eq("tenant_id", tenantId)
    .select("id, name")
    .limit(1)
    .maybeSingle<{ id: string; name: string }>()

  if (branchResult.error || !branchResult.data) {
    return { ok: false, error: branchResult.error?.message ?? "No pudimos actualizar el modo operativo de la sucursal." }
  }

  const deleteWeeklyWindowsResult = await supabase.from("branch_operating_windows").delete().eq("branch_id", branchId)

  if (deleteWeeklyWindowsResult.error) {
    return { ok: false, error: deleteWeeklyWindowsResult.error.message }
  }

  if (normalizedInput.weeklyWindows.length > 0) {
    const weeklyInsertResult = await supabase.from("branch_operating_windows").insert(
      normalizedInput.weeklyWindows.map((window) => ({
        branch_id: branchId,
        day_of_week: window.dayOfWeek,
        opens_at_local: window.opensAtLocal,
        closes_at_local: window.closesAtLocal,
        sort_order: window.sortOrder,
        is_active: true,
      }))
    )

    if (weeklyInsertResult.error) {
      return { ok: false, error: weeklyInsertResult.error.message }
    }
  }

  const existingExceptionsResult = await supabase
    .from("branch_schedule_exceptions")
    .select("id")
    .eq("branch_id", branchId)
    .returns<{ id: string }[]>()

  if (existingExceptionsResult.error) {
    return { ok: false, error: existingExceptionsResult.error.message }
  }

  const existingExceptionIds = (existingExceptionsResult.data ?? []).map((entry) => entry.id)

  if (existingExceptionIds.length > 0) {
    const deleteExceptionWindowsResult = await supabase.from("branch_schedule_exception_windows").delete().in("exception_id", existingExceptionIds)

    if (deleteExceptionWindowsResult.error) {
      return { ok: false, error: deleteExceptionWindowsResult.error.message }
    }
  }

  const deleteExceptionsResult = await supabase.from("branch_schedule_exceptions").delete().eq("branch_id", branchId)

  if (deleteExceptionsResult.error) {
    return { ok: false, error: deleteExceptionsResult.error.message }
  }

  for (const exception of normalizedInput.exceptions) {
    const insertExceptionResult = await supabase
      .from("branch_schedule_exceptions")
      .insert({
        branch_id: branchId,
        exception_date: exception.exceptionDate,
        mode: exception.mode,
        label: exception.label,
        is_active: true,
      })
      .select("id")
      .single<{ id: string }>()

    if (insertExceptionResult.error || !insertExceptionResult.data) {
      return { ok: false, error: insertExceptionResult.error?.message ?? "No pudimos guardar una excepcion del horario." }
    }

    if (exception.windows.length > 0) {
      const insertWindowsResult = await supabase.from("branch_schedule_exception_windows").insert(
        exception.windows.map((window) => ({
          exception_id: insertExceptionResult.data.id,
          opens_at_local: window.opensAtLocal,
          closes_at_local: window.closesAtLocal,
          sort_order: window.sortOrder,
          is_active: true,
        }))
      )

      if (insertWindowsResult.error) {
        return { ok: false, error: insertWindowsResult.error.message }
      }
    }
  }

  await writeAuditEvent(supabase, {
    tenantId,
    branchId,
    actor: auditActor ?? { profileId: null, membershipId: null, name: null, role: null, surface: "admin" },
    entityType: "branch",
    entityId: branchId,
    action: "branch.schedule_updated",
    summary: `Se actualizó el horario operativo de la sucursal ${branchResult.data.name}.`,
    afterData: {
      timeZone: BRANCH_SCHEDULE_TIME_ZONE,
      orderingMode: input.orderingMode,
      weeklyWindows: normalizedInput.weeklyWindows,
      exceptions: normalizedInput.exceptions,
    },
    metadata: {
      branchId,
      branchName: branchResult.data.name,
    },
  })

  return { ok: true }
}
