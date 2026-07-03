export type CheckoutBagItemModifierInput = {
  readonly modifierGroupId: string
  readonly modifierGroupName: string
  readonly modifierOptionId: string
  readonly modifierOptionName: string
  readonly priceDelta: number
}

export type CheckoutBagItemInput = {
  readonly id: string
  readonly productId: string
  readonly productVariantId?: string | null
  readonly variantName?: string | null
  readonly tenantSlug: string
  readonly branchId: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly unitPrice: number
  readonly unitPriceLabel: string
  readonly quantity: number
  readonly modifierSelections: readonly CheckoutBagItemModifierInput[]
}

export type CheckoutCustomerInput = {
  readonly fullName: string
  readonly phone: string
  readonly email: string
  readonly notes?: string
}

export type ManualPaymentMethod = "mobile_payment" | "bank_transfer"

export function formatManualPaymentMethod(method: ManualPaymentMethod) {
  if (method === "mobile_payment") {
    return "Pago móvil"
  }

  return "Transferencia bancaria"
}

export type TenantManualPaymentSettings = {
  readonly mobilePaymentInstructions: string | null
  readonly bankTransferInstructions: string | null
}

export type CreateOrderInput = {
  readonly tenantSlug: string
  readonly branchId: string
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
  readonly assignedMembershipId: string | null
  readonly assignedStaffName: string | null
  readonly paymentStatus: PaymentStatus
  readonly paymentMethod: ManualPaymentMethod | null
  readonly hasPaymentReceipt: boolean
  readonly paymentReceiptImagePath?: string | null
  readonly paymentReceiptSignedUrl?: string | null
  readonly channel: string
  readonly placedAt: string
  readonly totalAmount: number
}

export type OrderStatus = "pending_payment" | "confirmed" | "in_preparation" | "ready" | "fulfilled" | "cancelled"
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"

export function formatOrderStatus(status: string, fulfillmentType?: "pickup" | "delivery") {
  switch (status) {
    case "pending_payment":
      return "Pago pendiente"
    case "confirmed":
      return "Confirmado"
    case "in_preparation":
      return "En preparación"
    case "ready":
      return "Listo"
    case "fulfilled":
      if (fulfillmentType === "delivery") {
        return "Entregado"
      }

      if (fulfillmentType === "pickup") {
        return "Retirado"
      }

      return "Finalizado"
    case "cancelled":
      return "Cancelado"
    default:
      return status
  }
}

export function formatPaymentStatus(status: PaymentStatus) {
  switch (status) {
    case "pending":
      return "Pendiente"
    case "paid":
      return "Pagado"
    case "failed":
      return "Fallido"
    case "refunded":
      return "Reembolsado"
    default:
      return status
  }
}

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
  readonly paymentStatus: PaymentStatus
  readonly paymentMethod: ManualPaymentMethod | null
  readonly paymentReceiptImageUrl: string | null
  readonly previousPaymentReceiptImageUrl: string | null
  readonly paymentRejectionReason: string | null
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

export type PaymentReceiptSubmissionSummary = {
  readonly id: string
  readonly paymentMethod: ManualPaymentMethod
  readonly receiptImagePath: string
  readonly reviewStatus: "pending" | "rejected" | "accepted"
  readonly rejectionReason: string | null
  readonly submittedAt: string
  readonly reviewedAt: string | null
  readonly reviewedByName: string | null
}

export type AdminOrderDetail = {
  readonly id: string
  readonly orderNumber: number
  readonly status: string
  readonly assignedMembershipId: string | null
  readonly assignedStaffName: string | null
  readonly paymentStatus: PaymentStatus
  readonly paymentMethod: ManualPaymentMethod | null
  readonly paymentReceiptImageUrl: string | null
  readonly previousPaymentReceiptImageUrl: string | null
  readonly paymentRejectionReason: string | null
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
  readonly paymentReceiptSubmissions: readonly PaymentReceiptSubmissionSummary[]
  readonly items: readonly AdminOrderDetailItem[]
}

export type KitchenOrderSummary = {
  readonly id: string
  readonly orderNumber: number
  readonly customerName: string
  readonly branchName: string
  readonly status: OrderStatus
  readonly assignedMembershipId: string | null
  readonly assignedStaffName: string | null
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
    modifiers: readonly {
      modifierGroupName: string
      modifierOptionName: string
    }[]
  }[]
}
