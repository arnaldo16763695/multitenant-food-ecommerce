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

    const channels: RealtimeChannel[] = []

    if (tenantId) {
      channels.push(
        supabase
          .channel(`orders-tenant-${tenantId}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${tenantId}` }, scheduleRefresh)
          .subscribe()
      )
    }

    if (customerId) {
      channels.push(
        supabase
          .channel(`orders-customer-${customerId}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${customerId}` }, scheduleRefresh)
          .subscribe()
      )
    }

    if (orderId) {
      channels.push(
        supabase
          .channel(`order-detail-${orderId}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, scheduleRefresh)
          .on("postgres_changes", { event: "*", schema: "public", table: "order_items", filter: `order_id=eq.${orderId}` }, scheduleRefresh)
          .on("postgres_changes", { event: "*", schema: "public", table: "order_status_history", filter: `order_id=eq.${orderId}` }, scheduleRefresh)
          .subscribe()
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
