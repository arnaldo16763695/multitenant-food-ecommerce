import type { SupabaseClient } from "@supabase/supabase-js"

import type { CustomerAddress, CustomerAddressMutationInput, CustomerAddressMutationResult } from "@/lib/domain/customer-address"

type CustomerAddressRow = {
  id: string
  customer_id: string
  label: string
  address_line_1: string
  address_line_2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string
  latitude: number | null
  longitude: number | null
  delivery_notes: string | null
  is_default: boolean
}

function mapAddress(row: CustomerAddressRow): CustomerAddress {
  return {
    id: row.id,
    customerId: row.customer_id,
    label: row.label,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    deliveryNotes: row.delivery_notes,
    isDefault: row.is_default,
    hasCoordinates: row.latitude != null && row.longitude != null,
  }
}

function validateAddressInput(input: CustomerAddressMutationInput): string | null {
  if (!input.label.trim()) {
    return "Ponle un nombre a esta dirección, por ejemplo Casa u Oficina."
  }

  if (!input.addressLine1.trim()) {
    return "Agrega al menos una calle o avenida para esta dirección."
  }

  return null
}

export async function getCustomerAddresses(supabase: SupabaseClient, customerId: string): Promise<readonly CustomerAddress[]> {
  const result = await supabase
    .from("customer_addresses")
    .select("id, customer_id, label, address_line_1, address_line_2, city, state, postal_code, country, latitude, longitude, delivery_notes, is_default")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<CustomerAddressRow[]>()

  if (result.error || !result.data) {
    return []
  }

  return result.data.map(mapAddress)
}

async function clearDefaultAddress(supabase: SupabaseClient, customerId: string, excludeAddressId?: string) {
  let query = supabase.from("customer_addresses").update({ is_default: false }).eq("customer_id", customerId).eq("is_default", true)

  if (excludeAddressId) {
    query = query.neq("id", excludeAddressId)
  }

  await query
}

export async function createCustomerAddress(
  supabase: SupabaseClient,
  input: CustomerAddressMutationInput & { readonly customerId: string }
): Promise<CustomerAddressMutationResult> {
  const validationError = validateAddressInput(input)

  if (validationError) {
    return { ok: false, error: validationError }
  }

  if (input.isDefault) {
    await clearDefaultAddress(supabase, input.customerId)
  }

  const insertResult = await supabase
    .from("customer_addresses")
    .insert({
      customer_id: input.customerId,
      label: input.label.trim(),
      address_line_1: input.addressLine1.trim(),
      address_line_2: input.addressLine2?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      postal_code: input.postalCode?.trim() || null,
      country: input.country?.trim() || "MX",
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      delivery_notes: input.deliveryNotes?.trim() || null,
      is_default: Boolean(input.isDefault),
    })
    .select("id, customer_id, label, address_line_1, address_line_2, city, state, postal_code, country, latitude, longitude, delivery_notes, is_default")
    .single<CustomerAddressRow>()

  if (insertResult.error || !insertResult.data) {
    return { ok: false, error: insertResult.error?.message ?? "No pudimos guardar la dirección." }
  }

  return { ok: true, address: mapAddress(insertResult.data) }
}

export async function updateCustomerAddress(
  supabase: SupabaseClient,
  addressId: string,
  customerId: string,
  input: CustomerAddressMutationInput
): Promise<CustomerAddressMutationResult> {
  const validationError = validateAddressInput(input)

  if (validationError) {
    return { ok: false, error: validationError }
  }

  if (input.isDefault) {
    await clearDefaultAddress(supabase, customerId, addressId)
  }

  const updateResult = await supabase
    .from("customer_addresses")
    .update({
      label: input.label.trim(),
      address_line_1: input.addressLine1.trim(),
      address_line_2: input.addressLine2?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      postal_code: input.postalCode?.trim() || null,
      country: input.country?.trim() || "MX",
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      delivery_notes: input.deliveryNotes?.trim() || null,
      is_default: Boolean(input.isDefault),
    })
    .eq("id", addressId)
    .eq("customer_id", customerId)
    .select("id, customer_id, label, address_line_1, address_line_2, city, state, postal_code, country, latitude, longitude, delivery_notes, is_default")
    .single<CustomerAddressRow>()

  if (updateResult.error || !updateResult.data) {
    return { ok: false, error: updateResult.error?.message ?? "No encontramos esa dirección en tu cuenta." }
  }

  return { ok: true, address: mapAddress(updateResult.data) }
}

export async function deleteCustomerAddress(supabase: SupabaseClient, addressId: string, customerId: string): Promise<CustomerAddressMutationResult> {
  const deleteResult = await supabase.from("customer_addresses").delete().eq("id", addressId).eq("customer_id", customerId)

  if (deleteResult.error) {
    return { ok: false, error: deleteResult.error.message }
  }

  return { ok: true }
}

export async function setDefaultCustomerAddress(supabase: SupabaseClient, addressId: string, customerId: string): Promise<CustomerAddressMutationResult> {
  await clearDefaultAddress(supabase, customerId, addressId)

  const updateResult = await supabase
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("customer_id", customerId)
    .select("id, customer_id, label, address_line_1, address_line_2, city, state, postal_code, country, latitude, longitude, delivery_notes, is_default")
    .single<CustomerAddressRow>()

  if (updateResult.error || !updateResult.data) {
    return { ok: false, error: updateResult.error?.message ?? "No encontramos esa dirección en tu cuenta." }
  }

  return { ok: true, address: mapAddress(updateResult.data) }
}
