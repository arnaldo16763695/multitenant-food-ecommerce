// Per-branch delivery configuration -- opt-in, default off (see branch_delivery_settings
// migration). deliveryRadiusKm is only meaningful when deliveryEnabled is true; the DB enforces
// that pairing via branches_delivery_radius_check.
export type BranchDeliverySettings = {
  readonly deliveryEnabled: boolean
  readonly deliveryFee: number
  readonly deliveryRadiusKm: number | null
}
