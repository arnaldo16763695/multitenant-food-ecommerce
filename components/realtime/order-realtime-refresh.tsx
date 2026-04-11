"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { RealtimeChannel } from "@supabase/supabase-js"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type OrderRealtimeRefreshProps = {
  readonly tenantId?: string
  readonly customerId?: string
  readonly orderId?: string
}

export function OrderRealtimeRefresh({ tenantId, customerId, orderId }: OrderRealtimeRefreshProps) {
  const router = useRouter()

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    if (!supabase) {
      return
    }

    let refreshTimeout: number | null = null

    const scheduleRefresh = () => {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout)
      }

      refreshTimeout = window.setTimeout(() => {
        router.refresh()
      }, 180)
    }

    const trackChannel = (channel: RealtimeChannel) => {
      channel.subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Supabase realtime subscription issue", {
            channel: channel.topic,
            status,
            error,
            tenantId,
            customerId,
            orderId,
          })
        }
      })

      return channel
    }

    const channels: RealtimeChannel[] = []

    if (tenantId) {
      channels.push(
        trackChannel(
          supabase
            .channel(`orders-tenant-${tenantId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${tenantId}` }, scheduleRefresh)
        )
      )
    }

    if (customerId) {
      channels.push(
        trackChannel(
          supabase
            .channel(`orders-customer-${customerId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${customerId}` }, scheduleRefresh)
        )
      )
    }

    if (orderId) {
      channels.push(
        trackChannel(
          supabase
            .channel(`order-detail-${orderId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, scheduleRefresh)
            .on("postgres_changes", { event: "*", schema: "public", table: "order_items", filter: `order_id=eq.${orderId}` }, scheduleRefresh)
            .on("postgres_changes", { event: "*", schema: "public", table: "order_status_history", filter: `order_id=eq.${orderId}` }, scheduleRefresh)
            .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `order_id=eq.${orderId}` }, scheduleRefresh)
        )
      )
    }

    return () => {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout)
      }

      channels.forEach((channel) => {
        void supabase.removeChannel(channel)
      })
    }
  }, [customerId, orderId, router, tenantId])

  return null
}
