import { beforeEach, describe, expect, it, vi } from "vitest"

const { revalidatePath } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}))

const {
  requireKitchenAccess,
  createSupabaseAdminClient,
  createSupabaseServerClient,
  getActiveBranchIdsForMembership,
  assignKitchenOrder,
  canKitchenMarkOrderReady,
  ensureKitchenAssignmentAccess,
  updateKitchenOrderItemPrepStatus,
  updateAdminOrderStatus,
} = vi.hoisted(() => ({
  requireKitchenAccess: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getActiveBranchIdsForMembership: vi.fn(),
  assignKitchenOrder: vi.fn(),
  canKitchenMarkOrderReady: vi.fn(),
  ensureKitchenAssignmentAccess: vi.fn(),
  updateKitchenOrderItemPrepStatus: vi.fn(),
  updateAdminOrderStatus: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath,
}))

vi.mock("@/lib/auth/admin", () => ({
  requireKitchenAccess,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}))

vi.mock("@/lib/services/staff", () => ({
  getActiveBranchIdsForMembership,
}))

vi.mock("@/lib/services/orders", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/orders")>("@/lib/services/orders")

  return {
    ...actual,
    assignKitchenOrder,
    canKitchenMarkOrderReady,
    ensureKitchenAssignmentAccess,
    updateKitchenOrderItemPrepStatus,
    updateAdminOrderStatus,
  }
})

import {
  assignKitchenOrderAction,
  updateKitchenOrderItemPrepStatusAction,
  updateKitchenOrderStatusAction,
} from "@/app/app/[tenantSlug]/kitchen/actions"

describe("assignKitchenOrderAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requireKitchenAccess.mockResolvedValue({
      membership: {
        id: "membership-1",
        tenantId: "tenant-1",
        role: "preparer",
      },
      profile: {
        id: "profile-1",
        fullName: "Chef Uno",
      },
    })
  })

  it("loads active branch ids and revalidates paths on success", async () => {
    createSupabaseAdminClient.mockReturnValue({ kind: "admin-client" })
    getActiveBranchIdsForMembership.mockResolvedValue(["branch-1", "branch-2"])
    assignKitchenOrder.mockResolvedValue({ ok: true })

    const result = await assignKitchenOrderAction("burger-house", "order-1")

    expect(getActiveBranchIdsForMembership).toHaveBeenCalledWith({ kind: "admin-client" }, "membership-1")
    expect(assignKitchenOrder).toHaveBeenCalledWith(
      { kind: "admin-client" },
      "tenant-1",
      "order-1",
      "membership-1",
      ["branch-1", "branch-2"],
      {
        membershipId: "membership-1",
        name: "Chef Uno",
        profileId: "profile-1",
        role: "preparer",
        surface: "kitchen",
      }
    )
    expect(revalidatePath).toHaveBeenCalledTimes(2)
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/app/burger-house/kitchen")
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/app/burger-house/admin/orders")
    expect(result).toEqual({ ok: true })
  })
})

describe("updateKitchenOrderStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requireKitchenAccess.mockResolvedValue({
      membership: {
        id: "membership-1",
        tenantId: "tenant-1",
        role: "preparer",
      },
      profile: {
        id: "profile-1",
        fullName: "Chef Uno",
      },
    })
  })

  it("rejects statuses that kitchen is not allowed to set", async () => {
    const result = await updateKitchenOrderStatusAction("burger-house", "order-1", "confirmed")

    expect(result).toEqual({ ok: false, error: "Kitchen no puede mover la orden a ese estado." })
    expect(requireKitchenAccess).not.toHaveBeenCalled()
  })

  it("stops when assignment access fails", async () => {
    createSupabaseAdminClient.mockReturnValue({ kind: "admin-client" })
    getActiveBranchIdsForMembership.mockResolvedValue(["branch-1"])
    ensureKitchenAssignmentAccess.mockResolvedValue({ ok: false, error: "No puedes operar esta orden." })

    const result = await updateKitchenOrderStatusAction("burger-house", "order-1", "in_preparation")

    expect(ensureKitchenAssignmentAccess).toHaveBeenCalledWith(
      { kind: "admin-client" },
      "tenant-1",
      "order-1",
      "membership-1",
      "preparer",
      ["branch-1"]
    )
    expect(updateAdminOrderStatus).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: "No puedes operar esta orden." })
  })

  it("requires the ready check before moving an order to ready", async () => {
    createSupabaseAdminClient.mockReturnValue({ kind: "admin-client" })
    getActiveBranchIdsForMembership.mockResolvedValue(["branch-1"])
    ensureKitchenAssignmentAccess.mockResolvedValue({ ok: true })
    canKitchenMarkOrderReady.mockResolvedValue({ ok: false, error: "Faltan items por preparar." })

    const result = await updateKitchenOrderStatusAction("burger-house", "order-1", "ready")

    expect(canKitchenMarkOrderReady).toHaveBeenCalledWith({ kind: "admin-client" }, "tenant-1", "order-1")
    expect(updateAdminOrderStatus).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: "Faltan items por preparar." })
  })

  it("updates the status and revalidates affected paths when checks pass", async () => {
    createSupabaseAdminClient.mockReturnValue({ kind: "admin-client" })
    getActiveBranchIdsForMembership.mockResolvedValue(["branch-1"])
    ensureKitchenAssignmentAccess.mockResolvedValue({ ok: true })
    canKitchenMarkOrderReady.mockResolvedValue({ ok: true })
    updateAdminOrderStatus.mockResolvedValue({ ok: true })

    const result = await updateKitchenOrderStatusAction("burger-house", "order-1", "ready")

    expect(updateAdminOrderStatus).toHaveBeenCalledWith(
      { kind: "admin-client" },
      "tenant-1",
      "order-1",
      "ready",
      "profile-1",
      {
        membershipId: "membership-1",
        name: "Chef Uno",
        profileId: "profile-1",
        role: "preparer",
        surface: "kitchen",
      }
    )
    expect(revalidatePath).toHaveBeenCalledTimes(4)
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/app/burger-house/kitchen")
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/app/burger-house/admin/orders")
    expect(revalidatePath).toHaveBeenNthCalledWith(3, "/app/burger-house/account/orders")
    expect(revalidatePath).toHaveBeenNthCalledWith(4, "/app/burger-house/orders/order-1")
    expect(result).toEqual({ ok: true })
  })
})

describe("updateKitchenOrderItemPrepStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requireKitchenAccess.mockResolvedValue({
      membership: {
        id: "membership-1",
        tenantId: "tenant-1",
        role: "preparer",
      },
      profile: {
        id: "profile-1",
        fullName: "Chef Uno",
      },
    })
  })

  it("stops when assignment access fails", async () => {
    createSupabaseAdminClient.mockReturnValue({ kind: "admin-client" })
    getActiveBranchIdsForMembership.mockResolvedValue(["branch-1"])
    ensureKitchenAssignmentAccess.mockResolvedValue({ ok: false, error: "No puedes operar esta orden." })

    const result = await updateKitchenOrderItemPrepStatusAction("burger-house", "order-1", "item-1", "ready")

    expect(updateKitchenOrderItemPrepStatus).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: "No puedes operar esta orden." })
  })

  it("updates item prep status and revalidates affected paths on success", async () => {
    createSupabaseAdminClient.mockReturnValue({ kind: "admin-client" })
    getActiveBranchIdsForMembership.mockResolvedValue(["branch-1"])
    ensureKitchenAssignmentAccess.mockResolvedValue({ ok: true })
    updateKitchenOrderItemPrepStatus.mockResolvedValue({ ok: true })

    const result = await updateKitchenOrderItemPrepStatusAction("burger-house", "order-1", "item-1", "ready")

    expect(updateKitchenOrderItemPrepStatus).toHaveBeenCalledWith(
      { kind: "admin-client" },
      "tenant-1",
      "item-1",
      "ready",
      {
        membershipId: "membership-1",
        name: "Chef Uno",
        profileId: "profile-1",
        role: "preparer",
        surface: "kitchen",
      }
    )
    expect(revalidatePath).toHaveBeenCalledTimes(4)
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/app/burger-house/kitchen")
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/app/burger-house/admin/orders")
    expect(revalidatePath).toHaveBeenNthCalledWith(3, "/app/burger-house/account/orders")
    expect(revalidatePath).toHaveBeenNthCalledWith(4, "/app/burger-house/orders/order-1")
    expect(result).toEqual({ ok: true })
  })
})
