export const BRANCH_ORDERING_MODES = ["auto", "force_open", "force_closed"] as const
export const BRANCH_EXCEPTION_MODES = ["force_closed", "custom_hours"] as const
export const BRANCH_SCHEDULE_TIME_ZONE = "America/Caracas"
export const BRANCH_SCHEDULE_UTC_OFFSET_MINUTES = -4 * 60
export const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"] as const

export type BranchOrderingMode = (typeof BRANCH_ORDERING_MODES)[number]
export type BranchScheduleExceptionMode = (typeof BRANCH_EXCEPTION_MODES)[number]

export type BranchOperatingWindow = {
  readonly id: string
  readonly branchId: string
  readonly dayOfWeek: number
  readonly opensAtLocal: string
  readonly closesAtLocal: string
  readonly sortOrder: number
  readonly isActive: boolean
}

export type BranchScheduleExceptionWindow = {
  readonly id: string
  readonly exceptionId: string
  readonly opensAtLocal: string
  readonly closesAtLocal: string
  readonly sortOrder: number
  readonly isActive: boolean
}

export type BranchScheduleException = {
  readonly id: string
  readonly branchId: string
  readonly exceptionDate: string
  readonly mode: BranchScheduleExceptionMode
  readonly label: string | null
  readonly isActive: boolean
  readonly windows: readonly BranchScheduleExceptionWindow[]
}

export type BranchScheduleConfig = {
  readonly branchId: string
  readonly orderingMode: BranchOrderingMode
  readonly weeklyWindows: readonly BranchOperatingWindow[]
  readonly exceptions: readonly BranchScheduleException[]
}

export type BranchOperationalStatus = {
  readonly isOpenNow: boolean
  readonly acceptingOrders: boolean
  readonly orderingMode: BranchOrderingMode
  readonly closureLabel: string | null
  readonly nextTransitionAt: string | null
  readonly nextTransitionLabel: string | null
}

export type BranchScheduleMutationInput = {
  readonly orderingMode: BranchOrderingMode
  readonly weeklyWindows: readonly {
    readonly id?: string
    readonly dayOfWeek: number
    readonly opensAtLocal: string
    readonly closesAtLocal: string
    readonly sortOrder: number
    readonly isActive: boolean
  }[]
  readonly exceptions: readonly {
    readonly id?: string
    readonly exceptionDate: string
    readonly mode: BranchScheduleExceptionMode
    readonly label?: string | null
    readonly isActive: boolean
    readonly windows: readonly {
      readonly id?: string
      readonly opensAtLocal: string
      readonly closesAtLocal: string
      readonly sortOrder: number
      readonly isActive: boolean
    }[]
  }[]
}
