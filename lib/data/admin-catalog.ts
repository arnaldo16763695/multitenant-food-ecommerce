import { cache } from "react";

import type { CatalogCategory, CatalogModifierGroup, CatalogProduct } from "@/lib/config/admin-catalog";
import { MOCK_CATALOG_MODULE, getCatalogModuleFromSupabase } from "@/lib/services/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CatalogModuleData = {
  readonly products: readonly CatalogProduct[];
  readonly categories: readonly CatalogCategory[];
  readonly modifierGroups: readonly CatalogModifierGroup[];
  readonly source: "supabase" | "mock";
};

type TenantRow = { id: string };

// Until the database is configured locally, the admin keeps working with mocks.
export const getAdminCatalogModule = cache(async (tenantSlug: string): Promise<CatalogModuleData> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return MOCK_CATALOG_MODULE;
  }

  try {
    const tenantResult = await supabase.from("tenants").select("id").eq("slug", tenantSlug).limit(1).maybeSingle<TenantRow>();

    if (tenantResult.error || !tenantResult.data) {
      return MOCK_CATALOG_MODULE;
    }

    const tenantId = tenantResult.data.id;

    return await getCatalogModuleFromSupabase(supabase, tenantId);
  } catch {
    return MOCK_CATALOG_MODULE;
  }
});
