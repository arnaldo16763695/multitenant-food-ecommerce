import { Resend } from "resend"

type SendBusinessOwnerProvisioningEmailInput = {
  readonly email: string
  readonly fullName: string
  readonly companyName: string
  readonly adminUrl: string
}

export async function sendBusinessOwnerProvisioningEmail({
  email,
  fullName,
  companyName,
  adminUrl,
}: SendBusinessOwnerProvisioningEmailInput) {
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFromEmail = process.env.RESEND_FROM_EMAIL

  if (!resendApiKey || !resendFromEmail) {
    console.info("[business-owner-access-link]", {
      email,
      companyName,
      adminUrl,
    })

    return { deliveredBy: "console" as const }
  }

  const resend = new Resend(resendApiKey)

  await resend.emails.send({
    from: resendFromEmail,
    to: email,
    subject: `Tu negocio ${companyName} ya fue provisionado en VZ Food`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1c1917;">
        <p style="font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: #c2410c; font-weight: 700;">VZ Food</p>
        <h1 style="font-size: 28px; line-height: 1.1; margin-top: 12px;">Tu panel ya esta listo</h1>
        <p style="font-size: 16px; line-height: 1.7; color: #44403c;">Hola ${fullName || "equipo"}, ya provisionamos ${companyName} dentro de la plataforma. Puedes entrar a tu panel operativo desde el siguiente enlace.</p>
        <a href="${adminUrl}" style="display: inline-block; margin-top: 24px; background: #111827; color: white; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-weight: 700;">Entrar al panel</a>
        <p style="font-size: 13px; line-height: 1.7; color: #78716c; margin-top: 24px;">Si no esperabas este acceso, puedes ignorar este mensaje.</p>
      </div>
    `,
  })

  return { deliveredBy: "resend" as const }
}
