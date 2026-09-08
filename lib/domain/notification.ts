// Pure notification content: no IO. Maps an order lifecycle event to the Spanish copy for the
// two channels -- email (Resend) and WhatsApp (Meta Cloud API template messages).

export type OrderNotificationType =
  | "order_received"
  | "order_confirmed"
  | "order_in_preparation"
  | "order_ready"
  | "order_fulfilled"
  | "order_cancelled"
  | "payment_rejected"

// Only these four are also sent over WhatsApp -- they are the ones the customer must act on or
// that close a loop. Each needs an approved Meta template named exactly after the type.
export const WHATSAPP_NOTIFICATION_TYPES: ReadonlySet<OrderNotificationType> = new Set([
  "order_confirmed",
  "order_ready",
  "payment_rejected",
  "order_cancelled",
])

export type OrderNotificationContext = {
  readonly orderNumber: number
  readonly fulfillmentType: "pickup" | "delivery"
  readonly tenantName: string
  readonly customerName: string | null
}

export type OrderNotificationEmailContent = {
  readonly subject: string
  readonly eyebrow: string
  readonly headline: string
  readonly body: string
  readonly ctaLabel: string
}

export type OrderNotificationWhatsappMessage = {
  readonly templateName: string
  // Ordered {{1}}..{{n}} body parameters. Convention: [firstName, orderNumber, tenantName].
  readonly bodyParams: readonly string[]
}

const EYEBROW = "VZ Food"

function firstName(fullName: string | null): string {
  const trimmed = fullName?.trim() ?? ""
  return trimmed ? trimmed.split(/\s+/)[0] : "cliente"
}

type EmailTemplate = {
  readonly subject: string
  readonly headline: string
  // Rendered after "Hola <nombre>, " -- starts lowercase on purpose.
  readonly body: string
  readonly ctaLabel: string
}

function buildEmailTemplate(type: OrderNotificationType, ctx: OrderNotificationContext): EmailTemplate {
  const n = ctx.orderNumber
  const isDelivery = ctx.fulfillmentType === "delivery"

  switch (type) {
    case "order_received":
      return {
        subject: `Recibimos tu pedido #${n}`,
        headline: "Recibimos tu pedido",
        body: "estamos validando tu comprobante de pago. Te avisaremos en cuanto lo confirmemos.",
        ctaLabel: "Ver mi pedido",
      }
    case "order_confirmed":
      return {
        subject: `Confirmamos tu pedido #${n}`,
        headline: "Confirmamos tu pedido",
        body: "verificamos tu pago y tu pedido entró a la cola de preparación.",
        ctaLabel: "Ver mi pedido",
      }
    case "order_in_preparation":
      return {
        subject: `Tu pedido #${n} está en preparación`,
        headline: "Tu pedido está en preparación",
        body: "la cocina ya está preparando tu pedido.",
        ctaLabel: "Ver mi pedido",
      }
    case "order_ready":
      return isDelivery
        ? {
            subject: `Tu pedido #${n} va en camino`,
            headline: "Tu pedido va en camino",
            body: "tu pedido está listo y sale hacia tu dirección.",
            ctaLabel: "Ver mi pedido",
          }
        : {
            subject: `Tu pedido #${n} está listo`,
            headline: "Tu pedido está listo",
            body: "puedes pasar a recogerlo cuando quieras.",
            ctaLabel: "Ver mi pedido",
          }
    case "order_fulfilled":
      return {
        subject: `${isDelivery ? "Entregamos" : "Retiraste"} tu pedido #${n}`,
        headline: isDelivery ? "Entregamos tu pedido" : "Retiraste tu pedido",
        body: `¡gracias por tu compra en ${ctx.tenantName}!`,
        ctaLabel: "Ver mi pedido",
      }
    case "order_cancelled":
      return {
        subject: `Cancelamos tu pedido #${n}`,
        headline: "Cancelamos tu pedido",
        body: "si tienes dudas sobre esta cancelación, contáctanos.",
        ctaLabel: "Ver mi pedido",
      }
    case "payment_rejected":
      return {
        subject: `Revisa el comprobante de tu pedido #${n}`,
        headline: "No pudimos validar tu comprobante",
        body: "revisa el motivo del rechazo y vuelve a subir tu comprobante para continuar con el pedido.",
        ctaLabel: "Subir comprobante",
      }
    default: {
      const exhaustiveCheck: never = type
      throw new Error(`Unhandled notification type: ${String(exhaustiveCheck)}`)
    }
  }
}

export function buildOrderNotificationEmailContent(
  type: OrderNotificationType,
  ctx: OrderNotificationContext
): OrderNotificationEmailContent {
  const template = buildEmailTemplate(type, ctx)

  return {
    subject: template.subject,
    eyebrow: EYEBROW,
    headline: template.headline,
    body: template.body,
    ctaLabel: template.ctaLabel,
  }
}

// Returns null for a type that is not sent over WhatsApp.
export function buildOrderNotificationWhatsappMessage(
  type: OrderNotificationType,
  ctx: OrderNotificationContext
): OrderNotificationWhatsappMessage | null {
  if (!WHATSAPP_NOTIFICATION_TYPES.has(type)) {
    return null
  }

  return {
    templateName: type,
    bodyParams: [firstName(ctx.customerName), String(ctx.orderNumber), ctx.tenantName],
  }
}
