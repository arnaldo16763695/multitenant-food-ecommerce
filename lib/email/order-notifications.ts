import { Resend } from "resend"

import { renderBaseEmail } from "@/lib/email/base-template"

type SendOrderNotificationEmailInput = {
  readonly email: string
  readonly customerName: string | null
  readonly subject: string
  readonly eyebrow: string
  readonly headline: string
  readonly body: string
  readonly ctaLabel: string
  readonly ctaUrl: string
  readonly fallbackTag: string
}

// Transactional order-lifecycle email. Mirrors the other lib/email/* modules: console fallback
// when Resend env vars are unset, throws on a Resend API error so the caller (the notification
// dispatcher) can log it without the failure propagating to the order mutation.
export async function sendOrderNotificationEmail({
  email,
  customerName,
  subject,
  eyebrow,
  headline,
  body,
  ctaLabel,
  ctaUrl,
  fallbackTag,
}: SendOrderNotificationEmailInput): Promise<{ deliveredBy: "resend" | "console" }> {
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFromEmail = process.env.RESEND_FROM_EMAIL

  if (!resendApiKey || !resendFromEmail) {
    console.info(`[${fallbackTag}]`, {
      email,
      ctaUrl,
    })

    return { deliveredBy: "console" as const }
  }

  const html = renderBaseEmail({
    eyebrow,
    headline,
    bodyHtml: `<p style="font-size: 16px; line-height: 1.7; color: #44403c;">Hola ${customerName || "cliente"}, ${body}</p>`,
    cta: { label: ctaLabel, url: ctaUrl },
    footnote: "Recibes este correo por un pedido asociado a tu cuenta.",
  })

  const resend = new Resend(resendApiKey)

  const sendResult = await resend.emails.send({
    from: resendFromEmail,
    to: email,
    subject,
    html,
  })

  if (sendResult.error) {
    throw new Error(sendResult.error.message)
  }

  return { deliveredBy: "resend" as const }
}
