import type { SupabaseClient } from "@supabase/supabase-js"

import {
  buildOrderNotificationEmailContent,
  buildOrderNotificationWhatsappMessage,
  WHATSAPP_NOTIFICATION_TYPES,
  type OrderNotificationType,
} from "@/lib/domain/notification"
import { getAppUrl } from "@/lib/auth/app-url"
import { sendOrderNotificationEmail } from "@/lib/email/order-notifications"
import { normalizeVenezuelaPhone } from "@/lib/notifications/phone"
import { sendOrderWhatsapp } from "@/lib/notifications/whatsapp"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type DispatchOrderNotificationInput = {
  readonly tenantId: string
  readonly orderId: string
  readonly orderNumber: number
  readonly fulfillmentType: "pickup" | "delivery"
  readonly customerId: string | null
  readonly customerEmail: string | null
  readonly customerName: string | null
  readonly customerPhone: string | null
  readonly type: OrderNotificationType
  readonly dedupeKey?: string | null
}

type ChannelStatus = "sent" | "skipped" | "failed"
type WhatsappStatus = ChannelStatus | "not_applicable"

type TenantRow = { slug: string; name: string }

// Fan-out for a customer-meaningful order event: records a delivery row (service-role only,
// never read by a client), then sends email + WhatsApp. Best-effort with the same contract as
// writeAuditEvent -- it never throws and never blocks the order mutation. Channels run only
// when the delivery-row insert created a NEW row (a 23505 conflict means the event was already
// dispatched -> skip everything), which is the idempotency guarantee against server-action
// retries and double clicks. WhatsApp costs per message, so this matters.
export async function dispatchOrderNotification(
  supabase: SupabaseClient,
  input: DispatchOrderNotificationInput
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient() ?? supabase

    const tenantResult = await admin
      .from("tenants")
      .select("slug, name")
      .eq("id", input.tenantId)
      .limit(1)
      .maybeSingle<TenantRow>()

    if (tenantResult.error || !tenantResult.data) {
      console.error("Notification dispatch: tenant lookup failed", tenantResult.error?.message)
      return
    }

    const tenantSlug = tenantResult.data.slug
    const tenantName = tenantResult.data.name

    const insertResult = await admin
      .from("notifications")
      .insert({
        tenant_id: input.tenantId,
        customer_id: input.customerId,
        order_id: input.orderId,
        type: input.type,
        dedupe_key: input.dedupeKey ?? null,
        email_status: null,
        whatsapp_status: null,
      })
      .select("id")
      .maybeSingle<{ id: string }>()

    if (insertResult.error) {
      // 23505 = unique_violation on uq_notifications_order_type_dedupe: already dispatched.
      if (insertResult.error.code === "23505") {
        return
      }

      console.error("Notification dispatch: delivery-row insert failed", insertResult.error.message)
      return
    }

    const rowId = insertResult.data?.id
    const ctx = {
      orderNumber: input.orderNumber,
      fulfillmentType: input.fulfillmentType,
      tenantName,
      customerName: input.customerName,
    }
    const orderUrl = `${getAppUrl()}/app/${tenantSlug}/orders/${input.orderId}`

    const emailStatus = await deliverEmail(input, ctx, orderUrl)
    const { status: whatsappStatus, error: whatsappError } = await deliverWhatsapp(admin, input, ctx)

    if (rowId) {
      await admin
        .from("notifications")
        .update({
          email_status: emailStatus,
          whatsapp_status: whatsappStatus,
          metadata: {
            tenantSlug,
            orderNumber: input.orderNumber,
            ...(whatsappError ? { whatsappError } : {}),
          },
        })
        .eq("id", rowId)
    }
  } catch (error) {
    console.error("Notification dispatch failed", error)
  }
}

async function deliverEmail(
  input: DispatchOrderNotificationInput,
  ctx: Parameters<typeof buildOrderNotificationEmailContent>[1],
  orderUrl: string
): Promise<ChannelStatus> {
  if (!input.customerEmail) {
    return "skipped"
  }

  try {
    const content = buildOrderNotificationEmailContent(input.type, ctx)

    await sendOrderNotificationEmail({
      email: input.customerEmail,
      customerName: input.customerName,
      subject: content.subject,
      eyebrow: content.eyebrow,
      headline: content.headline,
      body: content.body,
      ctaLabel: content.ctaLabel,
      ctaUrl: orderUrl,
      fallbackTag: `order-notification-${input.type}`,
    })

    return "sent"
  } catch (error) {
    console.error("Notification dispatch: email send failed", error)
    return "failed"
  }
}

async function deliverWhatsapp(
  admin: SupabaseClient,
  input: DispatchOrderNotificationInput,
  ctx: Parameters<typeof buildOrderNotificationWhatsappMessage>[1]
): Promise<{ status: WhatsappStatus; error?: string }> {
  if (!WHATSAPP_NOTIFICATION_TYPES.has(input.type)) {
    return { status: "not_applicable" }
  }

  // opt-in is a live preference on `customers`, not an order-time snapshot.
  if (input.customerId) {
    const optInResult = await admin
      .from("customers")
      .select("whatsapp_opt_in")
      .eq("id", input.customerId)
      .limit(1)
      .maybeSingle<{ whatsapp_opt_in: boolean }>()

    if (optInResult.error || !optInResult.data?.whatsapp_opt_in) {
      return { status: "skipped" }
    }
  } else {
    // Guest order: no customers row, so no opt-in -> never send WhatsApp.
    return { status: "skipped" }
  }

  const to = normalizeVenezuelaPhone(input.customerPhone)

  if (!to) {
    return { status: "skipped" }
  }

  const message = buildOrderNotificationWhatsappMessage(input.type, ctx)

  if (!message) {
    return { status: "not_applicable" }
  }

  try {
    const result = await sendOrderWhatsapp({ to, templateName: message.templateName, bodyParams: message.bodyParams })
    // No config -> the sender logged a fallback and did not actually deliver.
    return { status: result.deliveredBy === "whatsapp" ? "sent" : "skipped" }
  } catch (error) {
    console.error("Notification dispatch: WhatsApp send failed", error)
    return { status: "failed", error: error instanceof Error ? error.message : String(error) }
  }
}
