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
    let isActive = true
    const debugContext = { tenantId, customerId, orderId, pollIntervalMs }

    const debugLog = (message: string, payload?: Record<string, unknown>) => {
      console.info("[OrderRealtimeRefresh]", message, {
        ...debugContext,
        ...(payload ?? {}),
      })
    }

    const scheduleRefresh = () => {
      debugLog("REFRESH_SCHEDULED")

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
          debugLog("POLLING_REFRESH")
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
      debugLog("visibilitychange", { visibilityState: document.visibilityState })

      if (document.visibilityState === "visible") {
        scheduleRefresh()
        startPolling()
        return
      }

      stopPolling()
    }

    const handleReconnect = () => {
      debugLog("window reconnect/focus")
      scheduleRefresh()
      startPolling()
    }

    const syncRealtimeAuth = async () => {
      if (!supabase) {
        return
      }

      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error("Supabase realtime auth sync failed", { error, tenantId, customerId, orderId })
        return
      }

      const accessToken = data.session?.access_token

      debugLog("auth session fetched", {
        hasSession: Boolean(data.session),
        hasAccessToken: Boolean(accessToken),
        userId: data.session?.user?.id ?? null,
      })

      if (!accessToken) {
        return
      }

      supabase.realtime.setAuth(accessToken)
      debugLog("realtime auth synced")
    }

    const trackChannel = (channel: RealtimeChannel) => {
      channel.subscribe((status, error) => {
        console.info(
          `[OrderRealtimeRefreshStatus] channel=${channel.topic} status=${status} hasError=${Boolean(error)} error=${error ? JSON.stringify(error) : "null"}`
        )

        debugLog("channel status", {
          channel: channel.topic,
          status,
          hasError: Boolean(error),
          error: error ?? null,
        })

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
    let authSubscription: { unsubscribe: () => void } | null = null

    if (supabase) {
      debugLog("browser client ready")
      void syncRealtimeAuth()

      const authListener = supabase.auth.onAuthStateChange((_event, session) => {
        debugLog("auth state changed", {
          event: _event,
          hasSession: Boolean(session),
          hasAccessToken: Boolean(session?.access_token),
          userId: session?.user?.id ?? null,
        })

        if (!isActive || !session?.access_token) {
          return
        }

        supabase.realtime.setAuth(session.access_token)
        debugLog("realtime auth updated from auth state change")
      })

      authSubscription = authListener.data.subscription

      if (tenantId) {
        channels.push(
          trackChannel(
            supabase
              .channel(`orders-tenant-${tenantId}`)
              .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${tenantId}` }, (payload) => {
                debugLog("REALTIME_EVENT_RECEIVED", {
                  scope: "tenant-orders",
                  eventType: payload.eventType,
                  schema: payload.schema,
                  table: payload.table,
                  newRecord: payload.new,
                  oldRecord: payload.old,
                })
                scheduleRefresh()
              })
          )
        )

        channels.push(
          trackChannel(
            supabase
              .channel(`orders-tenant-unfiltered-debug-${tenantId}`)
              .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
                debugLog("REALTIME_UNFILTERED_EVENT", {
                  scope: "orders-unfiltered",
                  eventType: payload.eventType,
                  schema: payload.schema,
                  table: payload.table,
                  newRecord: payload.new,
                  oldRecord: payload.old,
                })
              })
          )
        )
      }

      if (customerId) {
        channels.push(
          trackChannel(
            supabase
              .channel(`orders-customer-${customerId}`)
              .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${customerId}` }, (payload) => {
                debugLog("REALTIME_EVENT_RECEIVED", {
                  scope: "customer-orders",
                  eventType: payload.eventType,
                  schema: payload.schema,
                  table: payload.table,
                  newRecord: payload.new,
                  oldRecord: payload.old,
                })
                scheduleRefresh()
              })
          )
        )
      }

      if (orderId) {
        channels.push(
          trackChannel(
            supabase
              .channel(`order-detail-${orderId}`)
              .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, (payload) => {
                debugLog("REALTIME_EVENT_RECEIVED", {
                  scope: "order-detail",
                  eventType: payload.eventType,
                  schema: payload.schema,
                  table: payload.table,
                  newRecord: payload.new,
                  oldRecord: payload.old,
                })
                scheduleRefresh()
              })
              .on("postgres_changes", { event: "*", schema: "public", table: "order_items", filter: `order_id=eq.${orderId}` }, (payload) => {
                debugLog("REALTIME_EVENT_RECEIVED", {
                  scope: "order-items",
                  eventType: payload.eventType,
                  schema: payload.schema,
                  table: payload.table,
                  newRecord: payload.new,
                  oldRecord: payload.old,
                })
                scheduleRefresh()
              })
              .on("postgres_changes", { event: "*", schema: "public", table: "order_status_history", filter: `order_id=eq.${orderId}` }, (payload) => {
                debugLog("REALTIME_EVENT_RECEIVED", {
                  scope: "order-history",
                  eventType: payload.eventType,
                  schema: payload.schema,
                  table: payload.table,
                  newRecord: payload.new,
                  oldRecord: payload.old,
                })
                scheduleRefresh()
              })
              .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `order_id=eq.${orderId}` }, (payload) => {
                debugLog("REALTIME_EVENT_RECEIVED", {
                  scope: "payments",
                  eventType: payload.eventType,
                  schema: payload.schema,
                  table: payload.table,
                  newRecord: payload.new,
                  oldRecord: payload.old,
                })
                scheduleRefresh()
              })
          )
        )
      }
    } else {
      debugLog("browser client unavailable")
    }

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

      if (supabase) {
        channels.forEach((channel) => {
          void supabase.removeChannel(channel)
        })
      }

      authSubscription?.unsubscribe()
    }
  }, [customerId, orderId, pollIntervalMs, router, tenantId])

  return null
}
