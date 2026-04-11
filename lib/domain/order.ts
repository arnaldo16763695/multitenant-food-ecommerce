export type CheckoutBagItemInput = {
  readonly id: string
  readonly tenantSlug: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly unitPrice: number
  readonly unitPriceLabel: string
  readonly quantity: number
}

export type CheckoutCustomerInput = {
  readonly fullName: string
  readonly phone: string
  readonly email: string
  readonly notes?: string
}

export type CreateOrderInput = {
  readonly tenantSlug: string
  readonly customerId?: string | null
  readonly customer: CheckoutCustomerInput
  readonly items: readonly CheckoutBagItemInput[]
  readonly fulfillmentType: "pickup" | "delivery"
}

export type CreateOrderResult = {
  readonly ok: boolean
  readonly orderId?: string
  readonly orderNumber?: number
  readonly error?: string
}

export type CustomerOrderSummary = {
  readonly id: string
  readonly orderNumber: number
  readonly status: string
  readonly fulfillmentType: "pickup" | "delivery"
  readonly totalAmount: number
  readonly placedAt: string
  readonly itemCount: number
}

export type AdminOrderSummary = {
  readonly id: string
  readonly orderNumber: number
  readonly customerName: string
  readonly branchName: string
  readonly status: string
  readonly channel: string
  readonly placedAt: string
  readonly totalAmount: number
}

export type OrderStatus = "pending_payment" | "confirmed" | "in_preparation" | "ready" | "completed" | "cancelled"

export type CustomerOrderDetailItem = {
  readonly id: string
  readonly productName: string
  readonly categoryName: string | null
  readonly quantity: number
  readonly unitPrice: number
  readonly lineTotal: number
}

export type CustomerOrderDetail = {
  readonly id: string
  readonly orderNumber: number
  readonly status: string
  readonly fulfillmentType: "pickup" | "delivery"
  readonly totalAmount: number
  readonly subtotalAmount: number
  readonly placedAt: string
  readonly customerName: string
  readonly customerPhone: string | null
  readonly customerEmail: string | null
  readonly notes: string | null
  readonly items: readonly CustomerOrderDetailItem[]
}

export type AdminOrderDetailItem = {
  readonly id: string
  readonly productName: string
  readonly categoryName: string | null
  readonly quantity: number
  readonly unitPrice: number
  readonly lineTotal: number
  readonly notes: string | null
}

export type AdminOrderDetail = {
  readonly id: string
  readonly orderNumber: number
  readonly status: string
  readonly channel: string
  readonly fulfillmentType: "pickup" | "delivery"
  readonly customerName: string
  readonly customerPhone: string | null
  readonly customerEmail: string | null
  readonly branchName: string
  readonly subtotalAmount: number
  readonly totalAmount: number
  readonly placedAt: string
  readonly notes: string | null
  readonly items: readonly AdminOrderDetailItem[]
}

export type KitchenOrderSummary = {
  readonly id: string
  readonly orderNumber: number
  readonly customerName: string
  readonly branchName: string
  readonly status: OrderStatus
  readonly channel: string
  readonly fulfillmentType: "pickup" | "delivery"
  readonly placedAt: string
  readonly totalAmount: number
  readonly itemCount: number
  readonly notes: string | null
  readonly items: readonly {
    id: string
    productName: string
    quantity: number
    prepStatus: "pending" | "ready"
  }[]
}
