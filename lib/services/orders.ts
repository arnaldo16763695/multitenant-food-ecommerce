import type { SupabaseClient } from "@supabase/supabase-js"

import type { CreateOrderInput, CreateOrderResult, CustomerOrderDetail, CustomerOrderSummary } from "@/lib/domain/order"

type TenantRow = { id: string }
type BranchRow = { id: string; name: string }
type ProductRow = {
  id: string
  name: string
  base_price: number
  category_id: string | null
}
type CategoryRow = {
  id: string
  name: string
}
type OrderRow = {
  id: string
  order_number: number
}

type CustomerOrderRow = {
  id: string
  order_number: number
  status: string
  fulfillment_type: "pickup" | "delivery"
  total_amount: number
  placed_at: string
}

type OrderItemCountRow = {
  order_id: string
  quantity: number
}

type CustomerOrderDetailRow = {
  id: string
  order_number: number
  status: string
  fulfillment_type: "pickup" | "delivery"
  total_amount: number
  subtotal_amount: number
  placed_at: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  notes: string | null
}

type CustomerOrderDetailItemRow = {
  id: string
  order_id: string
  product_name_snapshot: string
  category_name_snapshot: string | null
  quantity: number
  unit_price_snapshot: number
  line_total: number
}

export async function createStorefrontOrder(supabase: SupabaseClient, input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!input.items.length) {
    return { ok: false, error: "La bolsa está vacía." }
  }

  if (!input.customer.fullName.trim() || !input.customer.phone.trim()) {
    return { ok: false, error: "Completa nombre y teléfono para continuar." }
  }

  const tenantResult = await supabase.from("tenants").select("id").eq("slug", input.tenantSlug).limit(1).maybeSingle<TenantRow>()

  if (tenantResult.error || !tenantResult.data) {
    return { ok: false, error: "No encontramos la marca asociada al pedido." }
  }

  const branchResult = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantResult.data.id)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle<BranchRow>()

  if (branchResult.error || !branchResult.data) {
    return { ok: false, error: "No encontramos una sucursal activa para este pedido." }
  }

  const productIds = input.items.map((item) => item.id)
  const productsResult = await supabase
    .from("products")
    .select("id, name, base_price, category_id")
    .eq("tenant_id", tenantResult.data.id)
    .in("id", productIds)
    .returns<ProductRow[]>()

  if (productsResult.error) {
    return { ok: false, error: productsResult.error.message }
  }

  const products = productsResult.data ?? []

  if (products.length !== productIds.length) {
    return { ok: false, error: "Uno o más productos ya no están disponibles." }
  }

  const categoryIds = products.map((product) => product.category_id).filter((value): value is string => Boolean(value))
  const categoriesResult = categoryIds.length
    ? await supabase.from("categories").select("id, name").in("id", categoryIds).returns<CategoryRow[]>()
    : { data: [], error: null }

  if (categoriesResult.error) {
    return { ok: false, error: categoriesResult.error.message }
  }

  const productMap = new Map(products.map((product) => [product.id, product]))
  const categoryMap = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]))

  const orderItemsPayload = input.items.map((item) => {
    const product = productMap.get(item.id)

    if (!product) {
      throw new Error(`Product ${item.id} not found during checkout.`)
    }

    const unitPrice = Number(product.base_price)

    return {
      product_id: product.id,
      product_name_snapshot: product.name,
      category_name_snapshot: product.category_id ? categoryMap.get(product.category_id) ?? item.category : item.category,
      unit_price_snapshot: unitPrice,
      quantity: item.quantity,
      line_total: Number((unitPrice * item.quantity).toFixed(2)),
      notes: null,
    }
  })

  const subtotal = orderItemsPayload.reduce((total, item) => total + item.line_total, 0)

  const orderResult = await supabase
    .from("orders")
    .insert({
      tenant_id: tenantResult.data.id,
      branch_id: branchResult.data.id,
      customer_id: input.customerId ?? null,
      channel: "web",
      fulfillment_type: input.fulfillmentType,
      status: "confirmed",
      payment_status: "pending",
      customer_name: input.customer.fullName.trim(),
      customer_phone: input.customer.phone.trim(),
      customer_email: input.customer.email.trim() || null,
      delivery_address_snapshot: input.fulfillmentType === "delivery" ? {} : null,
      subtotal_amount: subtotal,
      discount_amount: 0,
      delivery_fee: 0,
      tax_amount: 0,
      total_amount: subtotal,
      currency: "MXN",
      notes: input.customer.notes?.trim() || null,
      confirmed_at: new Date().toISOString(),
    })
    .select("id, order_number")
    .single<OrderRow>()

  if (orderResult.error || !orderResult.data) {
    return { ok: false, error: orderResult.error?.message ?? "No pudimos crear la orden." }
  }

  const orderItemsInsertResult = await supabase.from("order_items").insert(
    orderItemsPayload.map((item) => ({
      ...item,
      order_id: orderResult.data.id,
    }))
  )

  if (orderItemsInsertResult.error) {
    return { ok: false, error: orderItemsInsertResult.error.message }
  }

  const orderStatusHistoryResult = await supabase.from("order_status_history").insert({
    order_id: orderResult.data.id,
    from_status: null,
    to_status: "confirmed",
    changed_by_profile_id: null,
    source: "customer",
  })

  if (orderStatusHistoryResult.error) {
    return { ok: false, error: orderStatusHistoryResult.error.message }
  }

  return {
    ok: true,
    orderId: orderResult.data.id,
    orderNumber: orderResult.data.order_number,
  }
}

export async function getCustomerOrders(supabase: SupabaseClient, tenantSlug: string, customerId: string): Promise<readonly CustomerOrderSummary[]> {
  const tenantResult = await supabase.from("tenants").select("id").eq("slug", tenantSlug).limit(1).maybeSingle<TenantRow>()

  if (tenantResult.error || !tenantResult.data) {
    return []
  }

  const ordersResult = await supabase
    .from("orders")
    .select("id, order_number, status, fulfillment_type, total_amount, placed_at")
    .eq("tenant_id", tenantResult.data.id)
    .eq("customer_id", customerId)
    .order("placed_at", { ascending: false })
    .returns<CustomerOrderRow[]>()

  if (ordersResult.error) {
    return []
  }

  const orders = ordersResult.data ?? []
  const orderIds = orders.map((order) => order.id)

  const orderItemsResult = orderIds.length
    ? await supabase.from("order_items").select("order_id, quantity").in("order_id", orderIds).returns<OrderItemCountRow[]>()
    : { data: [], error: null }

  if (orderItemsResult.error) {
    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      fulfillmentType: order.fulfillment_type,
      totalAmount: Number(order.total_amount),
      placedAt: order.placed_at,
      itemCount: 0,
    }))
  }

  const itemCountMap = (orderItemsResult.data ?? []).reduce<Map<string, number>>((map, item) => {
    map.set(item.order_id, (map.get(item.order_id) ?? 0) + item.quantity)
    return map
  }, new Map())

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    fulfillmentType: order.fulfillment_type,
    totalAmount: Number(order.total_amount),
    placedAt: order.placed_at,
    itemCount: itemCountMap.get(order.id) ?? 0,
  }))
}

export async function getCustomerOrderDetail(
  supabase: SupabaseClient,
  tenantSlug: string,
  customerId: string,
  orderId: string
): Promise<CustomerOrderDetail | null> {
  const tenantResult = await supabase.from("tenants").select("id").eq("slug", tenantSlug).limit(1).maybeSingle<TenantRow>()

  if (tenantResult.error || !tenantResult.data) {
    return null
  }

  const orderResult = await supabase
    .from("orders")
    .select("id, order_number, status, fulfillment_type, total_amount, subtotal_amount, placed_at, customer_name, customer_phone, customer_email, notes")
    .eq("tenant_id", tenantResult.data.id)
    .eq("customer_id", customerId)
    .eq("id", orderId)
    .limit(1)
    .maybeSingle<CustomerOrderDetailRow>()

  if (orderResult.error || !orderResult.data) {
    return null
  }

  const orderItemsResult = await supabase
    .from("order_items")
    .select("id, order_id, product_name_snapshot, category_name_snapshot, quantity, unit_price_snapshot, line_total")
    .eq("order_id", orderResult.data.id)
    .returns<CustomerOrderDetailItemRow[]>()

  if (orderItemsResult.error) {
    return null
  }

  return {
    id: orderResult.data.id,
    orderNumber: orderResult.data.order_number,
    status: orderResult.data.status,
    fulfillmentType: orderResult.data.fulfillment_type,
    totalAmount: Number(orderResult.data.total_amount),
    subtotalAmount: Number(orderResult.data.subtotal_amount),
    placedAt: orderResult.data.placed_at,
    customerName: orderResult.data.customer_name,
    customerPhone: orderResult.data.customer_phone,
    customerEmail: orderResult.data.customer_email,
    notes: orderResult.data.notes,
    items: (orderItemsResult.data ?? []).map((item) => ({
      id: item.id,
      productName: item.product_name_snapshot,
      categoryName: item.category_name_snapshot,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price_snapshot),
      lineTotal: Number(item.line_total),
    })),
  }
}
