import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { sendOrderWhatsapp } from "@/lib/notifications/whatsapp"

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.restoreAllMocks()
  delete process.env.WHATSAPP_PHONE_NUMBER_ID
  delete process.env.WHATSAPP_ACCESS_TOKEN
  delete process.env.WHATSAPP_API_VERSION
  delete process.env.WHATSAPP_TEMPLATE_LANG
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe("sendOrderWhatsapp", () => {
  it("falls back to a console log when unconfigured", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const result = await sendOrderWhatsapp({ to: "584121234567", templateName: "order_ready", bodyParams: ["Ana", "42", "Acme"] })

    expect(result).toEqual({ deliveredBy: "console" })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalledWith("[whatsapp-fallback]", expect.objectContaining({ templateName: "order_ready" }))
  })

  it("posts a template message to the Cloud API when configured", async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456"
    process.env.WHATSAPP_ACCESS_TOKEN = "tok"

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 }))

    const result = await sendOrderWhatsapp({ to: "584121234567", templateName: "order_ready", bodyParams: ["Ana", "42", "Acme"] })

    expect(result).toEqual({ deliveredBy: "whatsapp" })
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe("https://graph.facebook.com/v21.0/123456/messages")
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok")

    const body = JSON.parse(String(init?.body))
    expect(body.to).toBe("584121234567")
    expect(body.template.name).toBe("order_ready")
    expect(body.template.language.code).toBe("es")
    expect(body.template.components[0].parameters).toEqual([
      { type: "text", text: "Ana" },
      { type: "text", text: "42" },
      { type: "text", text: "Acme" },
    ])
  })

  it("throws on a non-2xx response", async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456"
    process.env.WHATSAPP_ACCESS_TOKEN = "tok"

    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bad template", { status: 400 }))

    await expect(
      sendOrderWhatsapp({ to: "584121234567", templateName: "order_ready", bodyParams: [] })
    ).rejects.toThrow(/WhatsApp send failed \(400\)/)
  })
})
