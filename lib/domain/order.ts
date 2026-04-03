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
