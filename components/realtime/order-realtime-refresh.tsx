"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { RealtimeChannel } from "@supabase/supabase-js"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type OrderRealtimeRefreshProps = {
  readonly tenantId?: string
  readonly customerId?: string
  readonly orderId?: string
  readonly pollIntervalMs?: number
}

const DEFAULT_POLL_INTERVAL_MS = 5000

export function OrderRealtimeRefresh({
  tenantId,
  customerId,
  orderId,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: OrderRealtimeRefreshProps) {
  const router = useRouter()

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    let refreshTimeout: number | null = null
    let pollInterval: number | null = null

    const scheduleRefresh = () => {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout)
      }

      refreshTimeout = window.setTimeout(() => {
        router.refresh()
      }, 180)
    }

    const startPolling = () => {
      if (pollInterval || typeof window === "undefined") {
        return
      }

      pollInterval = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          router.refresh()
        }
      }, pollIntervalMs)
    }

    const stopPolling = () => {
      if (!pollInterval) {
        return
      }

      window.clearInterval(pollInterval)
      pollInterval = null
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleRefresh()
        startPolling()
        return
      }

      stopPolling()
    }

    const handleReconnect = () => {
      scheduleRefresh()
      startPolling()
    }

    const trackChannel = (channel: RealtimeChannel) => {
      channel.subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          return
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
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

    if (supabase) {
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
    }

    startPolling()
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleReconnect)
    window.addEventListener("online", handleReconnect)

    return () => {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout)
      }

      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleReconnect)
      window.removeEventListener("online", handleReconnect)

      if (supabase) {
        channels.forEach((channel) => {
          void supabase.removeChannel(channel)
        })
      }
    }
  }, [customerId, orderId, pollIntervalMs, router, tenantId])

  return null
}
