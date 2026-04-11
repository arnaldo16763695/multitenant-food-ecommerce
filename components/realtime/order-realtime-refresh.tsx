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

    if (!supabase) {
      return
    }

    let refreshTimeout: number | null = null
    let pollInterval: number | null = null
    let isActive = true
    let authSubscription: { unsubscribe: () => void } | null = null
    let currentAccessToken: string | null = null
    const channels: RealtimeChannel[] = []
    const debugContext = { tenantId, customerId, orderId }

    const debugLog = (message: string, payload?: Record<string, unknown>) => {
      console.info(`[OrderRealtimeRefresh] ${message}`, {
        ...debugContext,
        ...(payload ?? {}),
      })
    }

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

    const teardownChannels = () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel)
      })

      channels.length = 0
    }

    const subscribeChannel = (channel: RealtimeChannel) => {
      channel.subscribe((status, error) => {
        console.info(
          `[OrderRealtimeRefreshStatus] channel=${channel.topic} status=${status} hasError=${Boolean(error)} error=${error ? JSON.stringify(error) : "null"}`
        )

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          debugLog("REALTIME_CHANNEL_ISSUE", {
            channel: channel.topic,
            status,
            error: error ?? null,
          })
        }
      })

      channels.push(channel)
    }

    const buildChannels = () => {
      if (tenantId) {
        subscribeChannel(
          supabase
            .channel(`orders-tenant-${tenantId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${tenantId}` }, (payload) => {
              debugLog("REALTIME_EVENT_RECEIVED", {
                scope: "tenant-orders",
                eventType: payload.eventType,
                table: payload.table,
              })
              scheduleRefresh()
            })
        )

        subscribeChannel(
          supabase
            .channel(`orders-tenant-unfiltered-debug-${tenantId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
              debugLog("REALTIME_UNFILTERED_EVENT", {
                scope: "orders-unfiltered",
                eventType: payload.eventType,
                table: payload.table,
              })
            })
        )
      }

      if (customerId) {
        subscribeChannel(
          supabase
            .channel(`orders-customer-${customerId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${customerId}` }, (payload) => {
              debugLog("REALTIME_EVENT_RECEIVED", {
                scope: "customer-orders",
                eventType: payload.eventType,
                table: payload.table,
              })
              scheduleRefresh()
            })
        )
      }

      if (orderId) {
        subscribeChannel(
          supabase
            .channel(`order-detail-${orderId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, (payload) => {
              debugLog("REALTIME_EVENT_RECEIVED", {
                scope: "order-detail",
                eventType: payload.eventType,
                table: payload.table,
              })
              scheduleRefresh()
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "order_items", filter: `order_id=eq.${orderId}` }, (payload) => {
              debugLog("REALTIME_EVENT_RECEIVED", {
                scope: "order-items",
                eventType: payload.eventType,
                table: payload.table,
              })
              scheduleRefresh()
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "order_status_history", filter: `order_id=eq.${orderId}` }, (payload) => {
              debugLog("REALTIME_EVENT_RECEIVED", {
                scope: "order-history",
                eventType: payload.eventType,
                table: payload.table,
              })
              scheduleRefresh()
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `order_id=eq.${orderId}` }, (payload) => {
              debugLog("REALTIME_EVENT_RECEIVED", {
                scope: "payments",
                eventType: payload.eventType,
                table: payload.table,
              })
              scheduleRefresh()
            })
        )
      }
    }

    const syncRealtimeAuth = async (accessToken?: string | null) => {
      const nextToken = accessToken ?? null

      if (nextToken === currentAccessToken) {
        return
      }

      currentAccessToken = nextToken

      if (!nextToken) {
        debugLog("REALTIME_AUTH_MISSING")
        return
      }

      supabase.realtime.setAuth(nextToken)
      debugLog("REALTIME_AUTH_SYNCED")

      teardownChannels()
      buildChannels()
    }

    const setupRealtime = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error("Supabase realtime auth sync failed", { error, tenantId, customerId, orderId })
        return
      }

      debugLog("REALTIME_SESSION_READY", {
        hasSession: Boolean(data.session),
        hasAccessToken: Boolean(data.session?.access_token),
        userId: data.session?.user?.id ?? null,
      })

      await syncRealtimeAuth(data.session?.access_token)
    }

    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) {
        return
      }

      void syncRealtimeAuth(session?.access_token)
    })

    authSubscription = authListener.data.subscription
    void setupRealtime()

    startPolling()
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleReconnect)
    window.addEventListener("online", handleReconnect)

    return () => {
      isActive = false

      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout)
      }

      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleReconnect)
      window.removeEventListener("online", handleReconnect)

      authSubscription?.unsubscribe()
      teardownChannels()
    }
  }, [customerId, orderId, pollIntervalMs, router, tenantId])

  return null
}
