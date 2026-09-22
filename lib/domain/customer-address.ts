export type CustomerAddress = {
  readonly id: string
  readonly customerId: string
  readonly label: string
  readonly addressLine1: string
  readonly addressLine2: string | null
  readonly city: string | null
  readonly state: string | null
  readonly postalCode: string | null
  readonly country: string
  readonly latitude: number | null
  readonly longitude: number | null
  readonly deliveryNotes: string | null
  readonly isDefault: boolean
  // Derived: whether this address can be used for a delivery order. Coordinates only ever come
  // from the browser's geolocation API (see customer-address-form) -- an address the customer
  // saved while denying/lacking location permission has no coordinates and can't be selected for
  // delivery until they retry sharing their location.
  readonly hasCoordinates: boolean
}

export type CustomerAddressMutationInput = {
  readonly label: string
  readonly addressLine1: string
  readonly addressLine2?: string | null
  readonly city?: string | null
  readonly state?: string | null
  readonly postalCode?: string | null
  readonly country?: string
  readonly latitude?: number | null
  readonly longitude?: number | null
  readonly deliveryNotes?: string | null
  readonly isDefault?: boolean
}

export type CustomerAddressMutationResult = {
  readonly ok: boolean
  readonly error?: string
  readonly address?: CustomerAddress
}
