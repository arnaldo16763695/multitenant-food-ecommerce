import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import type { CheckoutBagItemModifierInput } from "@/lib/domain/order"
import { ensureKitchenAssignmentAccess, getOwnedPendingPaymentOrder, updateAdminOrderStatus, validateAndPriceItemModifiers } from "@/lib/services/orders"

// A minimal stand-in for the `.from("orders").select(...).eq(...).eq(...).limit(1).maybeSingle()`
// chain ensureKitchenAssignmentAccess runs after its role gate. Used only to prove a call reached
// (or never reached) that query -- not to exercise the query itself.
function createOrderLookupSupabaseStub(): SupabaseClient {
  const chain = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: null, error: null }),
  }

  return chain as unknown as SupabaseClient
}

// Stands in for the two tables updateAdminOrderStatus reads before it would ever mutate
// anything: "orders" (the current row) and, only for a "ready" transition,
// "order_items" (canKitchenMarkOrderReady's own prep-status check). rpc is a spy so a test can
// assert the mutation never ran when the ready-gate rejects the transition.
function createReadyGateSupabaseStub(
  orderRow: { status: string; branch_id: string; order_number: number; payment_status: string },
  orderItems: readonly { prep_status: "pending" | "ready" }[]
) {
  const ordersChain = {
    select: () => ordersChain,
    eq: () => ordersChain,
    limit: () => ordersChain,
    maybeSingle: async () => ({ data: orderRow, error: null }),
  }

  const orderItemsChain = {
    select: () => orderItemsChain,
    eq: () => orderItemsChain,
    returns: () => ({ data: orderItems, error: null }),
  }

  // writeAuditEvent runs after a successful transition and must never fail the operation --
  // give it somewhere harmless to write instead of letting it hit the "unexpected table" guard.
  const auditEventsChain = {
    insert: async () => ({ data: null, error: null }),
  }

  const rpc = vi.fn()

  const client = {
    from: (table: string) => {
      if (table === "orders") return ordersChain
      if (table === "order_items") return orderItemsChain
      if (table === "audit_events") return auditEventsChain

      throw new Error(`createReadyGateSupabaseStub: unexpected table "${table}"`)
    },
    rpc,
  }

  return { client: client as unknown as SupabaseClient, rpc }
}

function createSelection(overrides: Partial<CheckoutBagItemModifierInput> = {}): CheckoutBagItemModifierInput {
  return {
    modifierGroupId: "group-1",
    modifierGroupName: "Salsas",
    modifierOptionId: "option-1",
    modifierOptionName: "Mayonesa",
    priceDelta: 1,
    ...overrides,
  }
}

describe("validateAndPriceItemModifiers", () => {
  const allowedGroupIds = new Set(["group-1", "group-2"])

  const modifierGroupMap = new Map([
    [
      "group-1",
      {
        id: "group-1",
        name: "Salsas",
        selection_type: "single" as const,
        modifier_kind: "choice" as const,
        min_select: 1,
        max_select: 1,
      },
    ],
    [
      "group-2",
      {
        id: "group-2",
        name: "Extras",
        selection_type: "multiple" as const,
        modifier_kind: "addon" as const,
        min_select: 0,
        max_select: 2,
      },
    ],
  ])

  const modifierGroupOptionsMap = new Map([
    [
      "group-1",
      [
        { id: "option-1", modifier_group_id: "group-1", price_delta: 1.5 },
        { id: "option-2", modifier_group_id: "group-1", price_delta: 0 },
      ],
    ],
    ["group-2", [{ id: "option-3", modifier_group_id: "group-2", price_delta: 2 }]],
  ])

  it("rejects selections for groups the product does not actually allow", () => {
    const result = validateAndPriceItemModifiers(
      [createSelection({ modifierGroupId: "group-3", modifierGroupName: "Otro" })],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "Uno de los modificadores seleccionados ya no está disponible para este producto." })
  })

  it("rejects selections for an allowed group id that no longer resolves to a real group", () => {
    const result = validateAndPriceItemModifiers(
      [createSelection({ modifierGroupId: "group-missing", modifierGroupName: "Otro", modifierOptionId: "option-x", modifierOptionName: "X" })],
      new Set(["group-missing"]),
      new Map(),
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "Uno de los grupos de modificadores seleccionados ya no existe." })
  })

  it("rejects multiple selections in single-choice groups", () => {
    const result = validateAndPriceItemModifiers(
      [createSelection({ modifierOptionId: "option-1" }), createSelection({ modifierOptionId: "option-2", modifierOptionName: "Mostaza" })],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "Solo puedes elegir una opción en Salsas." })
  })

  it("rejects a selection count above the group's max_select", () => {
    const result = validateAndPriceItemModifiers(
      [
        createSelection({ modifierGroupId: "group-2", modifierGroupName: "Extras", modifierOptionId: "option-3", modifierOptionName: "Queso" }),
        createSelection({ modifierGroupId: "group-2", modifierGroupName: "Extras", modifierOptionId: "option-3", modifierOptionName: "Queso" }),
        createSelection({ modifierGroupId: "group-2", modifierGroupName: "Extras", modifierOptionId: "option-3", modifierOptionName: "Queso" }),
      ],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "La selección en Extras no cumple las reglas configuradas." })
  })

  it("rejects unavailable options", () => {
    const result = validateAndPriceItemModifiers(
      [createSelection({ modifierOptionId: "missing-option", modifierOptionName: "Picante" })],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: false, error: "La opción Picante ya no está disponible." })
  })

  it("enforces required groups even when no selection was sent for them", () => {
    const result = validateAndPriceItemModifiers([], allowedGroupIds, modifierGroupMap, modifierGroupOptionsMap)

    expect(result).toEqual({ ok: false, error: "Debes completar la selección requerida en Salsas." })
  })

  it("re-prices from the server's own catalog and ignores a tampered client priceDelta", () => {
    const result = validateAndPriceItemModifiers(
      [createSelection({ priceDelta: 999999 })],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({
      ok: true,
      modifiers: [
        {
          modifier_group_name_snapshot: "Salsas",
          modifier_option_name_snapshot: "Mayonesa",
          modifier_kind_snapshot: "choice",
          price_snapshot: 1.5,
        },
      ],
    })
  })

  it("snapshots modifier_kind from the group's own catalog value", () => {
    const result = validateAndPriceItemModifiers(
      [
        createSelection({ modifierGroupId: "group-1", modifierOptionId: "option-1" }),
        createSelection({ modifierGroupId: "group-2", modifierGroupName: "Extras", modifierOptionId: "option-3", modifierOptionName: "Queso", priceDelta: 0 }),
      ],
      allowedGroupIds,
      modifierGroupMap,
      modifierGroupOptionsMap
    )

    expect(result).toEqual({
      ok: true,
      modifiers: [
        {
          modifier_group_name_snapshot: "Salsas",
          modifier_option_name_snapshot: "Mayonesa",
          modifier_kind_snapshot: "choice",
          price_snapshot: 1.5,
        },
        {
          modifier_group_name_snapshot: "Extras",
          modifier_option_name_snapshot: "Queso",
          modifier_kind_snapshot: "addon",
          price_snapshot: 2,
        },
      ],
    })
  })

  it("accepts an item with no modifier selections when nothing is required", () => {
    const result = validateAndPriceItemModifiers(
      [],
      new Set(["group-2"]),
      new Map([["group-2", modifierGroupMap.get("group-2")!]]),
      modifierGroupOptionsMap
    )

    expect(result).toEqual({ ok: true, modifiers: [] })
  })
})

describe("ensureKitchenAssignmentAccess", () => {
  it("rejects a role with no kitchen access before touching the database", async () => {
    // Passing a supabase stub whose every method throws proves the rejection happens purely
    // from the role check, before any query is attempted.
    const throwingSupabase = new Proxy(
      {},
      {
        get() {
          throw new Error("ensureKitchenAssignmentAccess should not query the database for a disallowed role")
        },
      }
    ) as unknown as SupabaseClient

    const result = await ensureKitchenAssignmentAccess(throwingSupabase, "tenant-1", "order-1", "membership-1", "cashier", ["branch-1"])

    expect(result).toEqual({ ok: false, error: "No tienes permisos para operar ordenes desde kitchen." })
  })

  it.each(["preparer", "owner", "manager", "branch_manager"])("lets %s past the role gate", async (role) => {
    const result = await ensureKitchenAssignmentAccess(createOrderLookupSupabaseStub(), "tenant-1", "order-1", "membership-1", role, ["branch-1"])

    // The stub reports no matching order, so a result past the role gate surfaces as "order not
    // found" -- proving this role reached the database instead of being rejected up front.
    expect(result).toEqual({ ok: false, error: "No encontramos la orden." })
  })
})

describe("updateAdminOrderStatus", () => {
  it('blocks marking an order "ready" when not every item has been prepared, regardless of the caller', async () => {
    const { client, rpc } = createReadyGateSupabaseStub(
      { status: "in_preparation", branch_id: "branch-1", order_number: 42, payment_status: "paid" },
      [{ prep_status: "ready" }, { prep_status: "pending" }]
    )

    const result = await updateAdminOrderStatus(client, "tenant-1", "order-1", "ready")

    expect(result).toEqual({ ok: false, error: "Debes marcar todos los items como listos antes de finalizar la orden." })
    // The rejection must happen before the state-changing RPC ever runs -- otherwise this is a
    // check with no teeth.
    expect(rpc).not.toHaveBeenCalled()
  })

  it('allows marking an order "ready" once every item is prepared', async () => {
    const { client, rpc } = createReadyGateSupabaseStub(
      { status: "in_preparation", branch_id: "branch-1", order_number: 42, payment_status: "paid" },
      [{ prep_status: "ready" }, { prep_status: "ready" }]
    )
    rpc.mockResolvedValue({ data: true, error: null })

    const result = await updateAdminOrderStatus(client, "tenant-1", "order-1", "ready")

    expect(rpc).toHaveBeenCalledWith(
      "update_order_status_atomic",
      expect.objectContaining({ p_from_status: "in_preparation", p_to_status: "ready" })
    )
    expect(result).toEqual({ ok: true })
  })
})

// Stands in for the two-table lookup (tenants, then orders) getOwnedPendingPaymentOrder runs.
function createOwnedPendingPaymentOrderStub(
  tenantRow: { id: string } | null,
  orderRow: { id: string; branch_id: string; order_number: number; status: string; payment_status: string } | null
): SupabaseClient {
  const tenantsChain = {
    select: () => tenantsChain,
    eq: () => tenantsChain,
    limit: () => tenantsChain,
    maybeSingle: async () => ({ data: tenantRow, error: null }),
  }

  const ordersChain = {
    select: () => ordersChain,
    eq: () => ordersChain,
    limit: () => ordersChain,
    maybeSingle: async () => ({ data: orderRow, error: null }),
  }

  const client = {
    from: (table: string) => {
      if (table === "tenants") return tenantsChain
      if (table === "orders") return ordersChain

      throw new Error(`createOwnedPendingPaymentOrderStub: unexpected table "${table}"`)
    },
  }

  return client as unknown as SupabaseClient
}

describe("getOwnedPendingPaymentOrder", () => {
  it("returns a 404-flagged error when the tenant slug does not resolve", async () => {
    const result = await getOwnedPendingPaymentOrder(createOwnedPendingPaymentOrderStub(null, null), "unknown-tenant", "customer-1", "order-1")

    expect(result).toEqual({ ok: false, status: 404, error: "No encontramos la marca asociada a la orden." })
  })

  it("returns a 400-flagged error when the order does not belong to this customer", async () => {
    const result = await getOwnedPendingPaymentOrder(
      createOwnedPendingPaymentOrderStub({ id: "tenant-1" }, null),
      "demo-brand",
      "customer-1",
      "order-1"
    )

    // Deliberately not 404 here: the query already scoped by tenant + customer + orderId
    // together, so a miss is ownership-shaped, not "resource doesn't exist" in the REST sense.
    expect(result).toEqual({ ok: false, status: 400, error: "No encontramos la orden dentro de tu cuenta." })
  })

  it("returns a 400-flagged error when the order is no longer pending payment", async () => {
    const result = await getOwnedPendingPaymentOrder(
      createOwnedPendingPaymentOrderStub({ id: "tenant-1" }, { id: "order-1", branch_id: "branch-1", order_number: 7, status: "confirmed", payment_status: "paid" }),
      "demo-brand",
      "customer-1",
      "order-1"
    )

    expect(result).toEqual({ ok: false, status: 400, error: "Solo puedes actualizar el comprobante mientras la orden siga pendiente de pago." })
  })

  it("succeeds for a pending-payment order the customer actually owns", async () => {
    const orderRow = { id: "order-1", branch_id: "branch-1", order_number: 7, status: "pending_payment", payment_status: "pending" }

    const result = await getOwnedPendingPaymentOrder(createOwnedPendingPaymentOrderStub({ id: "tenant-1" }, orderRow), "demo-brand", "customer-1", "order-1")

    expect(result).toEqual({ ok: true, tenantId: "tenant-1", order: orderRow })
  })
})
