import { beforeEach, describe, expect, it, vi } from "vitest"

const { revalidatePath } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}))

const {
  requireAdminAccess,
  createSupabaseAdminClient,
  createSupabaseServerClient,
  releaseAdminOrderAssignment,
  rejectManualPayment,
  updateAdminOrderPaymentStatus,
  updateAdminOrderStatus,
} = vi.hoisted(() => ({
  requireAdminAccess: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  releaseAdminOrderAssignment: vi.fn(),
  rejectManualPayment: vi.fn(),
  updateAdminOrderPaymentStatus: vi.fn(),
  updateAdminOrderStatus: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath,
}))

vi.mock("@/lib/auth/admin", () => ({
  requireAdminAccess,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}))

vi.mock("@/lib/services/orders", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/orders")>("@/lib/services/orders")

  return {
    ...actual,
    releaseAdminOrderAssignment,
    rejectManualPayment,
    updateAdminOrderPaymentStatus,
    updateAdminOrderStatus,
  }
})

import {
  releaseAdminOrderAssignmentAction,
  rejectManualPaymentAction,
  updateAdminOrderPaymentStatusAction,
  updateAdminOrderStatusAction,
} from "@/app/app/[tenantSlug]/admin/orders/actions"

describe("updateAdminOrderStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requireAdminAccess.mockResolvedValue({
      membership: {
        id: "membership-1",
        tenantId: "tenant-1",
        role: "owner",
      },
      profile: {
        id: "profile-1",
        fullName: "Admin Uno",
      },
    })
  })

  it("uses the admin client when available and revalidates affected paths on success", async () => {
    createSupabaseAdminClient.mockReturnValue({ kind: "admin-client" })
    updateAdminOrderStatus.mockResolvedValue({ ok: true })

    const result = await updateAdminOrderStatusAction("burger-house", "order-1", "ready")

    expect(createSupabaseServerClient).not.toHaveBeenCalled()
    expect(updateAdminOrderStatus).toHaveBeenCalledWith(
      { kind: "admin-client" },
      "tenant-1",
      "order-1",
      "ready",
      "profile-1",
      {
        membershipId: "membership-1",
        name: "Admin Uno",
        profileId: "profile-1",
        role: "owner",
        surface: "admin",
      }
    )
    expect(revalidatePath).toHaveBeenCalledTimes(5)
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/app/burger-house/admin/orders")
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/app/burger-house/admin/orders/order-1")
    expect(revalidatePath).toHaveBeenNthCalledWith(3, "/app/burger-house/kitchen")
    expect(revalidatePath).toHaveBeenNthCalledWith(4, "/app/burger-house/account/orders")
    expect(revalidatePath).toHaveBeenNthCalledWith(5, "/app/burger-house/orders/order-1")
    expect(result).toEqual({ ok: true })
  })

  it("falls back to the server client when the admin client is unavailable", async () => {
    createSupabaseAdminClient.mockReturnValue(null)
    createSupabaseServerClient.mockResolvedValue({ kind: "server-client" })
    updateAdminOrderStatus.mockResolvedValue({ ok: false, error: "No permitido." })

    const result = await updateAdminOrderStatusAction("burger-house", "order-1", "confirmed")

    expect(createSupabaseServerClient).toHaveBeenCalled()
    expect(updateAdminOrderStatus).toHaveBeenCalledWith(
      { kind: "server-client" },
      "tenant-1",
      "order-1",
      "confirmed",
      "profile-1",
      expect.objectContaining({ surface: "admin" })
    )
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: "No permitido." })
  })

  it("throws when no Supabase client is available", async () => {
    createSupabaseAdminClient.mockReturnValue(null)
    createSupabaseServerClient.mockResolvedValue(null)

    await expect(updateAdminOrderStatusAction("burger-house", "order-1", "confirmed")).rejects.toThrow(
      "Supabase environment variables are missing."
    )
  })

  it("rejects a preparer before touching Supabase or the orders service", async () => {
    requireAdminAccess.mockResolvedValue({
      membership: { id: "membership-1", tenantId: "tenant-1", role: "preparer" },
      profile: { id: "profile-1", fullName: "Prep Uno" },
    })

    const result = await updateAdminOrderStatusAction("burger-house", "order-1", "confirmed")

    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
    expect(updateAdminOrderStatus).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: "No tienes permisos para operar sobre esta orden." })
  })
})

describe("updateAdminOrderPaymentStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requireAdminAccess.mockResolvedValue({
      membership: {
        id: "membership-1",
        tenantId: "tenant-1",
        role: "owner",
      },
      profile: {
        id: "profile-1",
        fullName: "Admin Uno",
      },
    })
  })

  it("updates payment status and revalidates customer-facing paths on success", async () => {
    createSupabaseAdminClient.mockReturnValue({ kind: "admin-client" })
    updateAdminOrderPaymentStatus.mockResolvedValue({ ok: true })

    const result = await updateAdminOrderPaymentStatusAction("burger-house", "order-1", "paid")

    expect(updateAdminOrderPaymentStatus).toHaveBeenCalledWith(
      { kind: "admin-client" },
      "tenant-1",
      "order-1",
      "paid",
      {
        membershipId: "membership-1",
        name: "Admin Uno",
        profileId: "profile-1",
        role: "owner",
        surface: "admin",
      }
    )
    expect(revalidatePath).toHaveBeenCalledTimes(4)
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/app/burger-house/admin/orders")
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/app/burger-house/admin/orders/order-1")
    expect(revalidatePath).toHaveBeenNthCalledWith(3, "/app/burger-house/account/orders")
    expect(revalidatePath).toHaveBeenNthCalledWith(4, "/app/burger-house/orders/order-1")
    expect(result).toEqual({ ok: true })
  })

  it("rejects a preparer before touching Supabase or the orders service", async () => {
    requireAdminAccess.mockResolvedValue({
      membership: { id: "membership-1", tenantId: "tenant-1", role: "preparer" },
      profile: { id: "profile-1", fullName: "Prep Uno" },
    })

    const result = await updateAdminOrderPaymentStatusAction("burger-house", "order-1", "paid")

    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
    expect(updateAdminOrderPaymentStatus).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: "No tienes permisos para operar sobre esta orden." })
  })
})

describe("releaseAdminOrderAssignmentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requireAdminAccess.mockResolvedValue({
      membership: {
        id: "membership-1",
        tenantId: "tenant-1",
        role: "owner",
      },
      profile: {
        id: "profile-1",
        fullName: "Admin Uno",
      },
    })
  })

  it("releases assignment and revalidates kitchen and customer paths on success", async () => {
    createSupabaseAdminClient.mockReturnValue({ kind: "admin-client" })
    releaseAdminOrderAssignment.mockResolvedValue({ ok: true })

    const result = await releaseAdminOrderAssignmentAction("burger-house", "order-1")

    expect(releaseAdminOrderAssignment).toHaveBeenCalledWith(
      { kind: "admin-client" },
      "tenant-1",
      "order-1",
      {
        membershipId: "membership-1",
        name: "Admin Uno",
        profileId: "profile-1",
        role: "owner",
        surface: "admin",
      }
    )
    expect(revalidatePath).toHaveBeenCalledTimes(5)
    expect(result).toEqual({ ok: true })
  })

  it("rejects a preparer before touching Supabase or the orders service", async () => {
    requireAdminAccess.mockResolvedValue({
      membership: { id: "membership-1", tenantId: "tenant-1", role: "preparer" },
      profile: { id: "profile-1", fullName: "Prep Uno" },
    })

    const result = await releaseAdminOrderAssignmentAction("burger-house", "order-1")

    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
    expect(releaseAdminOrderAssignment).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: "No tienes permisos para operar sobre esta orden." })
  })
})

describe("rejectManualPaymentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requireAdminAccess.mockResolvedValue({
      membership: {
        id: "membership-1",
        tenantId: "tenant-1",
        role: "owner",
      },
      profile: {
        id: "profile-1",
        fullName: "Admin Uno",
      },
    })
  })

  it("sends the rejection reason and revalidates affected customer paths", async () => {
    createSupabaseAdminClient.mockReturnValue({ kind: "admin-client" })
    rejectManualPayment.mockResolvedValue({ ok: true })

    const result = await rejectManualPaymentAction("burger-house", "order-1", "Comprobante ilegible")

    expect(rejectManualPayment).toHaveBeenCalledWith(
      { kind: "admin-client" },
      "tenant-1",
      "order-1",
      "Comprobante ilegible",
      "profile-1",
      {
        membershipId: "membership-1",
        name: "Admin Uno",
        profileId: "profile-1",
        role: "owner",
        surface: "admin",
      }
    )
    expect(revalidatePath).toHaveBeenCalledTimes(4)
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/app/burger-house/admin/orders")
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/app/burger-house/admin/orders/order-1")
    expect(revalidatePath).toHaveBeenNthCalledWith(3, "/app/burger-house/account/orders")
    expect(revalidatePath).toHaveBeenNthCalledWith(4, "/app/burger-house/orders/order-1")
    expect(result).toEqual({ ok: true })
  })

  it("rejects a preparer before touching Supabase or the orders service", async () => {
    requireAdminAccess.mockResolvedValue({
      membership: { id: "membership-1", tenantId: "tenant-1", role: "preparer" },
      profile: { id: "profile-1", fullName: "Prep Uno" },
    })

    const result = await rejectManualPaymentAction("burger-house", "order-1", "Comprobante ilegible")

    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
    expect(rejectManualPayment).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: "No tienes permisos para operar sobre esta orden." })
  })
})
