import { describe, expect, it } from "vitest"

import { formatManualPaymentMethod, formatOrderStatus, formatPaymentStatus } from "@/lib/domain/order"

describe("formatManualPaymentMethod", () => {
  it("formats mobile payment labels", () => {
    expect(formatManualPaymentMethod("mobile_payment")).toBe("Pago m\u00f3vil")
  })

  it("formats bank transfer labels", () => {
    expect(formatManualPaymentMethod("bank_transfer")).toBe("Transferencia bancaria")
  })
})

describe("formatOrderStatus", () => {
  it("formats known base statuses", () => {
    expect(formatOrderStatus("pending_payment")).toBe("Pago pendiente")
    expect(formatOrderStatus("in_preparation")).toBe("En preparaci\u00f3n")
    expect(formatOrderStatus("cancelled")).toBe("Cancelado")
  })

  it("formats fulfilled status according to fulfillment type", () => {
    expect(formatOrderStatus("fulfilled", "delivery")).toBe("Entregado")
    expect(formatOrderStatus("fulfilled", "pickup")).toBe("Retirado")
    expect(formatOrderStatus("fulfilled")).toBe("Finalizado")
  })

  it("returns the original value for unknown statuses", () => {
    expect(formatOrderStatus("archived")).toBe("archived")
  })
})

describe("formatPaymentStatus", () => {
  it("formats known payment statuses", () => {
    expect(formatPaymentStatus("pending")).toBe("Pendiente")
    expect(formatPaymentStatus("paid")).toBe("Pagado")
    expect(formatPaymentStatus("failed")).toBe("Fallido")
    expect(formatPaymentStatus("refunded")).toBe("Reembolsado")
  })
})
