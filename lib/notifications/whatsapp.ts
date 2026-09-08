// WhatsApp delivery via the Meta Cloud API (Model A: one platform-owned WhatsApp Business
// Account / number for every tenant; the tenant name travels as a template body parameter).
// Isolated here so swapping to a BSP later is a one-file change.

type WhatsappConfig = {
  readonly phoneNumberId: string
  readonly accessToken: string
  readonly apiVersion: string
  readonly templateLang: string
}

// The single point where WhatsApp credentials are resolved. Today: platform-level env vars.
// For Model B (per-tenant sender) this would take a tenantId and consult a `whatsapp_settings`
// table for an override before falling back to these -- nothing else in the pipeline changes.
export function getWhatsappConfig(): WhatsappConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()

  if (!phoneNumberId || !accessToken) {
    return null
  }

  return {
    phoneNumberId,
    accessToken,
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || "v21.0",
    templateLang: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "es",
  }
}

type SendOrderWhatsappInput = {
  // E.164 digits without "+", e.g. "584121234567".
  readonly to: string
  readonly templateName: string
  readonly bodyParams: readonly string[]
}

// Best-effort from the caller's side: throws only on an API error so the dispatcher can record
// `whatsapp_status = 'failed'` and move on. Falls back to a console log when unconfigured.
export async function sendOrderWhatsapp({
  to,
  templateName,
  bodyParams,
}: SendOrderWhatsappInput): Promise<{ deliveredBy: "whatsapp" | "console" }> {
  const config = getWhatsappConfig()

  if (!config) {
    console.info("[whatsapp-fallback]", { to, templateName, bodyParams })
    return { deliveredBy: "console" as const }
  }

  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: config.templateLang },
        components: [
          {
            type: "body",
            parameters: bodyParams.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`WhatsApp send failed (${response.status}): ${detail}`)
  }

  return { deliveredBy: "whatsapp" as const }
}
