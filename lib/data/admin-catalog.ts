import { cache } from "react";

import type { CatalogBranchOption, CatalogCategory, CatalogModifierGroup, CatalogProduct } from "@/lib/config/admin-catalog";
import { EMPTY_CATALOG_MODULE, getCatalogModuleFromSupabase } from "@/lib/services/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CatalogModuleData = {
  readonly branches: readonly CatalogBranchOption[];
  readonly products: readonly CatalogProduct[];
  readonly categories: readonly CatalogCategory[];
  readonly modifierGroups: readonly CatalogModifierGroup[];
  readonly source: "supabase";
};

type TenantRow = { id: string };

export const getAdminCatalogModule = cache(async (tenantSlug: string): Promise<CatalogModuleData> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return EMPTY_CATALOG_MODULE;
  }

  try {
    const tenantResult = await supabase.from("tenants").select("id").eq("slug", tenantSlug).limit(1).maybeSingle<TenantRow>();

    if (tenantResult.error || !tenantResult.data) {
      return EMPTY_CATALOG_MODULE;
    }

    const tenantId = tenantResult.data.id;

    return await getCatalogModuleFromSupabase(supabase, tenantId);
  } catch {
    return EMPTY_CATALOG_MODULE;
  }
});
