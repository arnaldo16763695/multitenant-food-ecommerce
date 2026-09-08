import type { SupabaseClient } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { dispatchOrderNotification } from "@/lib/services/notifications"

const { sendOrderNotificationEmail } = vi.hoisted(() => ({ sendOrderNotificationEmail: vi.fn() }))
const { sendOrderWhatsapp } = vi.hoisted(() => ({ sendOrderWhatsapp: vi.fn() }))

vi.mock("@/lib/email/order-notifications", () => ({ sendOrderNotificationEmail }))
vi.mock("@/lib/notifications/whatsapp", () => ({ sendOrderWhatsapp }))
// Force the "no admin client" path so the dispatcher operates on the stub we pass in.
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => null }))

beforeEach(() => {
  sendOrderNotificationEmail.mockReset().mockResolvedValue({ deliveredBy: "resend" })
  sendOrderWhatsapp.mockReset().mockResolvedValue({ deliveredBy: "whatsapp" })
})

type StubConfig = {
  readonly tenant?: { slug: string; name: string } | null
  readonly insert?: { data: { id: string } | null; error: { code?: string; message: string } | null }
  readonly whatsappOptIn?: boolean
}

// Chainable stub that switches on table name (style of createReadyGateSupabaseStub in
// orders.test.ts). `insertSpy` / `updateSpy` capture the delivery-row writes.
function createDispatchStub(config: StubConfig) {
  const insertSpy = vi.fn()
  const updateSpy = vi.fn()

  const tenantsChain = {
    select: () => tenantsChain,
    eq: () => tenantsChain,
    limit: () => tenantsChain,
    maybeSingle: async () => ({ data: config.tenant ?? { slug: "acme", name: "Acme" }, error: null }),
  }

  const notificationsChain = {
    insert: (row: unknown) => {
      insertSpy(row)
      return notificationsChain
    },
    update: (patch: unknown) => {
      updateSpy(patch)
      return notificationsChain
    },
    select: () => notificationsChain,
    eq: () => notificationsChain,
    maybeSingle: async () => config.insert ?? { data: { id: "notif-1" }, error: null },
  }

  const customersChain = {
    select: () => customersChain,
    eq: () => customersChain,
    limit: () => customersChain,
    maybeSingle: async () => ({
      data: { whatsapp_opt_in: config.whatsappOptIn ?? true },
      error: null,
    }),
  }

  const client = {
    from: (table: string) => {
      if (table === "tenants") return tenantsChain
      if (table === "notifications") return notificationsChain
      if (table === "customers") return customersChain

      throw new Error(`createDispatchStub: unexpected table "${table}"`)
    },
  }

  return { client: client as unknown as SupabaseClient, insertSpy, updateSpy }
}

const baseInput = {
  tenantId: "tenant-1",
  orderId: "order-1",
  orderNumber: 42,
  fulfillmentType: "pickup" as const,
  customerId: "customer-1",
  customerEmail: "cliente@example.com",
  customerName: "Ana Torres",
  customerPhone: "04121234567",
  type: "order_confirmed" as const,
}

describe("dispatchOrderNotification", () => {
  it("records the delivery row and sends both channels for an eligible event", async () => {
    const { client, insertSpy, updateSpy } = createDispatchStub({})

    await dispatchOrderNotification(client, baseInput)

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "tenant-1", customer_id: "customer-1", order_id: "order-1", type: "order_confirmed" })
    )
    expect(sendOrderNotificationEmail).toHaveBeenCalledTimes(1)
    expect(sendOrderWhatsapp).toHaveBeenCalledWith(
      expect.objectContaining({ to: "584121234567", templateName: "order_confirmed", bodyParams: ["Ana", "42", "Acme"] })
    )
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ email_status: "sent", whatsapp_status: "sent" })
    )
  })

  it("skips every channel when the insert hits the idempotency conflict (23505)", async () => {
    const { client, updateSpy } = createDispatchStub({
      insert: { data: null, error: { code: "23505", message: "duplicate key" } },
    })

    await dispatchOrderNotification(client, baseInput)

    expect(sendOrderNotificationEmail).not.toHaveBeenCalled()
    expect(sendOrderWhatsapp).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it("marks whatsapp not_applicable for a non-WhatsApp event but still emails", async () => {
    const { client, updateSpy } = createDispatchStub({})

    await dispatchOrderNotification(client, { ...baseInput, type: "order_received" })

    expect(sendOrderNotificationEmail).toHaveBeenCalledTimes(1)
    expect(sendOrderWhatsapp).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ whatsapp_status: "not_applicable" }))
  })

  it("skips WhatsApp when the customer opted out", async () => {
    const { client, updateSpy } = createDispatchStub({ whatsappOptIn: false })

    await dispatchOrderNotification(client, baseInput)

    expect(sendOrderWhatsapp).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ whatsapp_status: "skipped" }))
  })

  it("skips WhatsApp when the phone cannot be normalized", async () => {
    const { client, updateSpy } = createDispatchStub({})

    await dispatchOrderNotification(client, { ...baseInput, customerPhone: "no tengo" })

    expect(sendOrderWhatsapp).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ whatsapp_status: "skipped" }))
  })

  it("skips email when there is no customer email", async () => {
    const { client, updateSpy } = createDispatchStub({})

    await dispatchOrderNotification(client, { ...baseInput, customerEmail: null })

    expect(sendOrderNotificationEmail).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ email_status: "skipped" }))
  })

  it("records failed statuses without throwing when a channel errors", async () => {
    sendOrderNotificationEmail.mockRejectedValueOnce(new Error("resend down"))
    sendOrderWhatsapp.mockRejectedValueOnce(new Error("meta 400"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { client, updateSpy } = createDispatchStub({})

    await expect(dispatchOrderNotification(client, baseInput)).resolves.toBeUndefined()

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ email_status: "failed", whatsapp_status: "failed" })
    )
  })

  it("never sends WhatsApp for a guest order (no customerId)", async () => {
    const { client } = createDispatchStub({})

    await dispatchOrderNotification(client, { ...baseInput, customerId: null })

    expect(sendOrderNotificationEmail).toHaveBeenCalledTimes(1)
    expect(sendOrderWhatsapp).not.toHaveBeenCalled()
  })
})
