"use server"

import { getCustomerAccountContext } from "@/lib/auth/customer"
import type { CustomerAddressMutationInput } from "@/lib/domain/customer-address"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createCustomerAddress, deleteCustomerAddress, setDefaultCustomerAddress, updateCustomerAddress } from "@/lib/services/customer-addresses"

export async function createCustomerAddressAction(payload: CustomerAddressMutationInput) {
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para guardar direcciones." }
  }

  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado en este entorno." }
  }

  return createCustomerAddress(supabase, { ...payload, customerId: customerContext.customer.id })
}

export async function updateCustomerAddressAction(addressId: string, payload: CustomerAddressMutationInput) {
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para editar tus direcciones." }
  }

  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado en este entorno." }
  }

  return updateCustomerAddress(supabase, addressId, customerContext.customer.id, payload)
}

export async function deleteCustomerAddressAction(addressId: string) {
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para editar tus direcciones." }
  }

  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado en este entorno." }
  }

  return deleteCustomerAddress(supabase, addressId, customerContext.customer.id)
}

export async function setDefaultCustomerAddressAction(addressId: string) {
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para editar tus direcciones." }
  }

  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado en este entorno." }
  }

  return setDefaultCustomerAddress(supabase, addressId, customerContext.customer.id)
}
