import { formatOrderStatus, type OrderStatus } from "@/lib/domain/order"

// The forward order lifecycle, in sequence -- see AGENTS.md's order lifecycle note. Excludes
// "cancelled": that's a dead-end branch reachable from any of these steps, not a fractional
// position along the path, so it can't be represented as "N of 5 steps done" without lying.
const FORWARD_STATUS_STEPS: readonly OrderStatus[] = ["pending_payment", "confirmed", "in_preparation", "ready", "fulfilled"]

type OrderStatusProgressProps = {
  readonly status: OrderStatus
}

// Purely visual progress indicator next to the status <select> in the admin orders table --
// the select stays the actual control for changing status; this just gives the operator an
// at-a-glance read of how far along the order is, since the label alone doesn't convey that.
export function OrderStatusProgress({ status }: OrderStatusProgressProps) {
  if (status === "cancelled") {
    return (
      <div className="mt-1.5 flex items-center gap-1.5">
        <div className="h-1.5 flex-1 rounded-full bg-destructive/60" />
        <span className="text-[10px] font-medium text-destructive">Cancelado</span>
      </div>
    )
  }

  const currentStepIndex = Math.max(0, FORWARD_STATUS_STEPS.indexOf(status))

  return (
    <div
      className="mt-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={FORWARD_STATUS_STEPS.length}
      aria-valuenow={currentStepIndex + 1}
      aria-valuetext={formatOrderStatus(status)}
    >
      <div className="flex items-center gap-1">
        {FORWARD_STATUS_STEPS.map((step, index) => (
          <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${index <= currentStepIndex ? "bg-emerald-500" : "bg-muted"}`} />
        ))}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Paso {currentStepIndex + 1} de {FORWARD_STATUS_STEPS.length}
      </p>
    </div>
  )
}
