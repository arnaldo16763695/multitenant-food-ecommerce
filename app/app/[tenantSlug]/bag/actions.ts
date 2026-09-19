"use server"

import { getCustomerAccountContext } from "@/lib/auth/customer"
import type { ShoppingBagModifierSelection } from "@/lib/domain/bag"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  addCustomerBagItem,
  addCustomerBagItemSplit,
  clearCustomerBranchBag,
  decrementCustomerBagItem,
  replaceCustomerBagItem,
  replaceCustomerBagItemSplit,
  removeCustomerBagItem,
} from "@/lib/services/customer-bag"

type CustomerBagMutationPayload = {
  readonly bagItemId?: string
  readonly tenantSlug: string
  readonly branchId: string
  readonly productId: string
  readonly productVariantId?: string | null
  readonly quantity?: number
  readonly modifierSelections?: readonly ShoppingBagModifierSelection[]
}

type CustomerBagSplitMutationPayload = {
  readonly tenantSlug: string
  readonly branchId: string
  readonly productId: string
  readonly productVariantId?: string | null
  readonly baseQuantity: number
  readonly baseModifierSelections: readonly ShoppingBagModifierSelection[]
  readonly customQuantity: number
  readonly customModifierSelections: readonly ShoppingBagModifierSelection[]
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
    modifierSelections: payload.modifierSelections,
    customerId: customerContext.customer.id,
  })
}

export async function addCustomerBagItemSplitAction(payload: CustomerBagSplitMutationPayload) {
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para agregar productos a tu bolsa." }
  }

  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado en este entorno." }
  }

  return addCustomerBagItemSplit(supabase, {
    tenantSlug: payload.tenantSlug,
    branchId: payload.branchId,
    productId: payload.productId,
    productVariantId: payload.productVariantId,
    baseQuantity: payload.baseQuantity,
    baseModifierSelections: payload.baseModifierSelections,
    customQuantity: payload.customQuantity,
    customModifierSelections: payload.customModifierSelections,
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
    bagItemId: payload.bagItemId,
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
    bagItemId: payload.bagItemId,
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

export async function replaceCustomerBagItemAction(payload: Required<Pick<CustomerBagMutationPayload, "bagItemId" | "tenantSlug" | "branchId" | "productId" | "quantity">> & Pick<CustomerBagMutationPayload, "productVariantId" | "modifierSelections">) {
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para editar tu bolsa." }
  }

  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado en este entorno." }
  }

  return replaceCustomerBagItem(supabase, {
    bagItemId: payload.bagItemId,
    tenantSlug: payload.tenantSlug,
    branchId: payload.branchId,
    productId: payload.productId,
    productVariantId: payload.productVariantId,
    quantity: payload.quantity,
    modifierSelections: payload.modifierSelections,
    customerId: customerContext.customer.id,
  })
}

export async function replaceCustomerBagItemSplitAction(payload: CustomerBagSplitMutationPayload & { readonly bagItemId: string }) {
  const customerContext = await getCustomerAccountContext()
  const supabase = createSupabaseAdminClient()

  if (!customerContext) {
    return { ok: false, error: "Inicia sesión para editar tu bolsa." }
  }

  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado en este entorno." }
  }

  return replaceCustomerBagItemSplit(supabase, {
    bagItemId: payload.bagItemId,
    tenantSlug: payload.tenantSlug,
    branchId: payload.branchId,
    productId: payload.productId,
    productVariantId: payload.productVariantId,
    baseQuantity: payload.baseQuantity,
    baseModifierSelections: payload.baseModifierSelections,
    customQuantity: payload.customQuantity,
    customModifierSelections: payload.customModifierSelections,
    customerId: customerContext.customer.id,
  })
}
