import { Resend } from "resend"

type SendPasswordRecoveryEmailInput = {
  readonly email: string
  readonly fullName: string
  readonly subject: string
  readonly eyebrow: string
  readonly headline: string
  readonly body: string
  readonly recoveryUrl: string
  readonly fallbackTag: string
}

export async function sendPasswordRecoveryEmail({
  email,
  fullName,
  subject,
  eyebrow,
  headline,
  body,
  recoveryUrl,
  fallbackTag,
}: SendPasswordRecoveryEmailInput) {
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFromEmail = process.env.RESEND_FROM_EMAIL

  if (!resendApiKey || !resendFromEmail) {
    console.info(`[${fallbackTag}]`, {
      email,
      recoveryUrl,
    })

    return { deliveredBy: "console" as const }
  }

  const resend = new Resend(resendApiKey)

  const sendResult = await resend.emails.send({
    from: resendFromEmail,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1c1917;">
        <p style="font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: #c2410c; font-weight: 700;">${eyebrow}</p>
        <h1 style="font-size: 28px; line-height: 1.1; margin-top: 12px;">${headline}</h1>
        <p style="font-size: 16px; line-height: 1.7; color: #44403c;">Hola ${fullName || "equipo"}, ${body}</p>
        <a href="${recoveryUrl}" style="display: inline-block; margin-top: 24px; background: #111827; color: white; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-weight: 700;">Restablecer password</a>
        <p style="font-size: 13px; line-height: 1.7; color: #78716c; margin-top: 24px;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
      </div>
    `,
  })

  if (sendResult.error) {
    throw new Error(sendResult.error.message)
  }

  return { deliveredBy: "resend" as const }
}
