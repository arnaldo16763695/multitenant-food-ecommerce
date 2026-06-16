"use server"

import { getCustomerAccountContext } from "@/lib/auth/customer"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  addCustomerBagItem,
  clearCustomerBranchBag,
  decrementCustomerBagItem,
  removeCustomerBagItem,
} from "@/lib/services/customer-bag"

type CustomerBagMutationPayload = {
  readonly tenantSlug: string
  readonly branchId: string
  readonly productId: string
  readonly productVariantId?: string | null
  readonly quantity?: number
}

type ClearCustomerBagPayload = {
  readonly tenantSlug: string
  readonly branchId: string
}

export async function addCustomerBagItemAction(payload: CustomerBagMutationPayload) {
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para agregar productos a tu bolsa." }
  }

  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado en este entorno." }
  }

  return addCustomerBagItem(supabase, {
    tenantSlug: payload.tenantSlug,
    branchId: payload.branchId,
    productId: payload.productId,
    productVariantId: payload.productVariantId,
    quantity: payload.quantity,
    customerId: customerContext.customer.id,
  })
}

export async function decrementCustomerBagItemAction(payload: CustomerBagMutationPayload) {
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para editar tu bolsa." }
  }

  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado en este entorno." }
  }

  return decrementCustomerBagItem(supabase, {
    tenantSlug: payload.tenantSlug,
    branchId: payload.branchId,
    productId: payload.productId,
    productVariantId: payload.productVariantId,
    customerId: customerContext.customer.id,
  })
}

export async function removeCustomerBagItemAction(payload: CustomerBagMutationPayload) {
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para editar tu bolsa." }
  }

  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado en este entorno." }
  }

  return removeCustomerBagItem(supabase, {
    tenantSlug: payload.tenantSlug,
    branchId: payload.branchId,
    productId: payload.productId,
    productVariantId: payload.productVariantId,
    customerId: customerContext.customer.id,
  })
}

export async function clearCustomerBranchBagAction(payload: ClearCustomerBagPayload) {
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para editar tu bolsa." }
  }

  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado en este entorno." }
  }

  return clearCustomerBranchBag(supabase, {
    tenantSlug: payload.tenantSlug,
    branchId: payload.branchId,
    customerId: customerContext.customer.id,
  })
}
