import { describe, expect, it } from "vitest"

import {
  buildOrderNotificationEmailContent,
  buildOrderNotificationWhatsappMessage,
  WHATSAPP_NOTIFICATION_TYPES,
} from "@/lib/domain/notification"

const baseCtx = { orderNumber: 42, fulfillmentType: "pickup" as const, tenantName: "Acme", customerName: "Ana Torres" }

describe("buildOrderNotificationEmailContent", () => {
  it("uses pickup wording for a ready pickup order", () => {
    const content = buildOrderNotificationEmailContent("order_ready", baseCtx)

    expect(content.subject).toBe("Tu pedido #42 está listo")
    expect(content.headline).toBe("Tu pedido está listo")
    expect(content.body).toContain("recogerlo")
  })

  it("uses delivery wording for a ready delivery order", () => {
    const content = buildOrderNotificationEmailContent("order_ready", { ...baseCtx, fulfillmentType: "delivery" })

    expect(content.subject).toBe("Tu pedido #42 va en camino")
    expect(content.body).toContain("dirección")
  })

  it("keeps Spanish accents intact", () => {
    expect(buildOrderNotificationEmailContent("order_confirmed", baseCtx).body).toContain("entró")
    expect(buildOrderNotificationEmailContent("order_in_preparation", baseCtx).subject).toContain("preparación")
    expect(buildOrderNotificationEmailContent("order_in_preparation", baseCtx).body).toContain("está preparando")
  })

  it("interpolates the tenant name into the fulfilled message", () => {
    const content = buildOrderNotificationEmailContent("order_fulfilled", {
      ...baseCtx,
      fulfillmentType: "delivery",
      tenantName: "Tacos del Centro",
    })

    expect(content.body).toContain("Tacos del Centro")
    expect(content.headline).toBe("Entregamos tu pedido")
  })
})

describe("buildOrderNotificationWhatsappMessage", () => {
  it("returns null for a type that is not sent over WhatsApp", () => {
    expect(buildOrderNotificationWhatsappMessage("order_received", baseCtx)).toBeNull()
    expect(buildOrderNotificationWhatsappMessage("order_in_preparation", baseCtx)).toBeNull()
    expect(buildOrderNotificationWhatsappMessage("order_fulfilled", baseCtx)).toBeNull()
  })

  it("maps an eligible type to its template plus [firstName, orderNumber, tenantName]", () => {
    const message = buildOrderNotificationWhatsappMessage("order_ready", baseCtx)

    expect(message).toEqual({ templateName: "order_ready", bodyParams: ["Ana", "42", "Acme"] })
  })

  it("falls back to 'cliente' when there is no customer name", () => {
    const message = buildOrderNotificationWhatsappMessage("payment_rejected", { ...baseCtx, customerName: null })

    expect(message?.bodyParams[0]).toBe("cliente")
  })

  it("exposes exactly the four eligible types", () => {
    expect([...WHATSAPP_NOTIFICATION_TYPES].sort()).toEqual(
      ["order_cancelled", "order_confirmed", "order_ready", "payment_rejected"].sort()
    )
  })
})
