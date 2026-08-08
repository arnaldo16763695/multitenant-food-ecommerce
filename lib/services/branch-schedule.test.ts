import { describe, expect, it } from "vitest"

import type { BranchScheduleConfig } from "@/lib/domain/branch-schedule"
import { resolveBranchOperationalStatus } from "@/lib/services/branch-schedule"

function buildConfig(overrides?: Partial<BranchScheduleConfig>): BranchScheduleConfig {
  return {
    branchId: "branch-1",
    orderingMode: "auto",
    weeklyWindows: [
      {
        id: "window-1",
        branchId: "branch-1",
        dayOfWeek: 4,
        opensAtLocal: "09:00",
        closesAtLocal: "18:00",
        sortOrder: 0,
        isActive: true,
      },
    ],
    exceptions: [],
    ...overrides,
  }
}

describe("resolveBranchOperationalStatus", () => {
  it("opens during a regular weekly window", () => {
    const status = resolveBranchOperationalStatus(buildConfig(), new Date("2026-08-06T16:30:00.000Z"))

    expect(status.isOpenNow).toBe(true)
    expect(status.acceptingOrders).toBe(true)
    expect(status.nextTransitionLabel).toContain("Cierra")
  })

  it("handles overnight windows", () => {
    const status = resolveBranchOperationalStatus(
      buildConfig({
        weeklyWindows: [
          {
            id: "window-overnight",
            branchId: "branch-1",
            dayOfWeek: 4,
            opensAtLocal: "20:00",
            closesAtLocal: "02:00",
            sortOrder: 0,
            isActive: true,
          },
        ],
      }),
      new Date("2026-08-07T03:30:00.000Z")
    )

    expect(status.isOpenNow).toBe(true)
  })

  it("closes for force_closed exceptions", () => {
    const status = resolveBranchOperationalStatus(
      buildConfig({
        exceptions: [
          {
            id: "exception-1",
            branchId: "branch-1",
            exceptionDate: "2026-08-06",
            mode: "force_closed",
            label: "Mantenimiento",
            isActive: true,
            windows: [],
          },
        ],
      }),
      new Date("2026-08-06T16:30:00.000Z")
    )

    expect(status.isOpenNow).toBe(false)
    expect(status.closureLabel).toBe("Mantenimiento")
  })

  it("respects force_open and force_closed modes", () => {
    expect(resolveBranchOperationalStatus(buildConfig({ orderingMode: "force_open" }), new Date()).isOpenNow).toBe(true)
    expect(resolveBranchOperationalStatus(buildConfig({ orderingMode: "force_closed" }), new Date()).isOpenNow).toBe(false)
  })
})
