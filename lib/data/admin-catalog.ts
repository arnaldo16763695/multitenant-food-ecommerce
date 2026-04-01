import { cache } from "react";

import {
  catalogCategories,
  catalogModifierGroups,
  catalogProducts,
  type CatalogCategory,
  type CatalogModifierGroup,
  type CatalogProduct,
} from "@/lib/config/admin-catalog";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CatalogModuleData = {
  readonly products: readonly CatalogProduct[];
  readonly categories: readonly CatalogCategory[];
  readonly modifierGroups: readonly CatalogModifierGroup[];
  readonly source: "supabase" | "mock";
};

const MOCK_CATALOG_MODULE: CatalogModuleData = {
  products: catalogProducts,
  categories: catalogCategories,
  modifierGroups: catalogModifierGroups,
  source: "mock",
};

type TenantRow = { id: string };
type BranchRow = { id: string; name: string };
type CategoryRow = { id: string; name: string; is_visible: boolean };
type ProductRow = {
  id: string;
  name: string;
  description: string;
  base_price: number | string;
  status: "active" | "draft";
  tags: string[] | null;
  category_id: string | null;
};
type ModifierGroupRow = {
  id: string;
  name: string;
  selection_type: "single" | "multiple";
};
type ProductModifierGroupRow = { product_id: string; modifier_group_id: string };
type BranchProductOverrideRow = {
  branch_id: string;
  product_id: string;
  availability_status: "available" | "paused" | "out_of_stock";
  price_override: number | string | null;
  prep_time_minutes: number | null;
};

function formatCurrency(value: number | string | null) {
  const numericValue = typeof value === "number" ? value : Number(value ?? 0);

  return `$ ${numericValue.toFixed(2)}`;
}

function mapAvailabilityStatus(status: BranchProductOverrideRow["availability_status"]) {
  if (status === "available") {
    return "Disponible" as const;
  }

  if (status === "paused") {
    return "Pausado" as const;
  }

  return "Sin stock" as const;
}

// Until the database is configured locally, the admin keeps working with mocks.
export const getAdminCatalogModule = cache(async (tenantSlug: string): Promise<CatalogModuleData> => {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return MOCK_CATALOG_MODULE;
  }

  try {
    const tenantResult = await supabase.from("tenants").select("id").eq("slug", tenantSlug).limit(1).maybeSingle<TenantRow>();

    if (tenantResult.error || !tenantResult.data) {
      return MOCK_CATALOG_MODULE;
    }

    const tenantId = tenantResult.data.id;

    const [branchesResult, categoriesResult, productsResult, modifierGroupsResult] = await Promise.all([
      supabase.from("branches").select("id, name").eq("tenant_id", tenantId).returns<BranchRow[]>(),
      supabase.from("categories").select("id, name, is_visible").eq("tenant_id", tenantId).order("sort_order", { ascending: true }).returns<CategoryRow[]>(),
      supabase.from("products").select("id, name, description, base_price, status, tags, category_id").eq("tenant_id", tenantId).order("name", { ascending: true }).returns<ProductRow[]>(),
      supabase.from("modifier_groups").select("id, name, selection_type").eq("tenant_id", tenantId).eq("is_active", true).order("name", { ascending: true }).returns<ModifierGroupRow[]>(),
    ]);

    if (
      branchesResult.error ||
      categoriesResult.error ||
      productsResult.error ||
      modifierGroupsResult.error
    ) {
      return MOCK_CATALOG_MODULE;
    }

    const branches = branchesResult.data ?? [];
    const categories = categoriesResult.data ?? [];
    const products = productsResult.data ?? [];
    const modifierGroups = modifierGroupsResult.data ?? [];

    const productIds = products.map((product) => product.id);

    const [productModifierGroupsResult, branchProductOverridesResult] = await Promise.all([
      productIds.length
        ? supabase
            .from("product_modifier_groups")
            .select("product_id, modifier_group_id")
            .in("product_id", productIds)
            .returns<ProductModifierGroupRow[]>()
        : Promise.resolve({ data: [], error: null } as { data: ProductModifierGroupRow[]; error: null }),
      productIds.length
        ? supabase
            .from("branch_product_overrides")
            .select("branch_id, product_id, availability_status, price_override, prep_time_minutes")
            .in("product_id", productIds)
            .returns<BranchProductOverrideRow[]>()
        : Promise.resolve({ data: [], error: null } as { data: BranchProductOverrideRow[]; error: null }),
    ]);

    if (productModifierGroupsResult.error || branchProductOverridesResult.error) {
      return MOCK_CATALOG_MODULE;
    }

    const productModifierGroups = productModifierGroupsResult.data ?? [];
    const branchProductOverrides = branchProductOverridesResult.data ?? [];

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const branchMap = new Map(branches.map((branch) => [branch.id, branch]));
    const modifierGroupMap = new Map(modifierGroups.map((group) => [group.id, group]));

    const productModifierGroupsMap = productModifierGroups.reduce<Map<string, string[]>>((map, relation) => {
      const currentValue = map.get(relation.product_id) ?? [];
      map.set(relation.product_id, [...currentValue, relation.modifier_group_id]);
      return map;
    }, new Map());

    const branchProductOverridesMap = branchProductOverrides.reduce<Map<string, BranchProductOverrideRow[]>>((map, override) => {
      const currentValue = map.get(override.product_id) ?? [];
      map.set(override.product_id, [...currentValue, override]);
      return map;
    }, new Map());

    const mappedProducts: CatalogProduct[] = products.map((product) => {
      const relatedCategory = product.category_id ? categoryMap.get(product.category_id) : null;
      const relatedModifierGroups = (productModifierGroupsMap.get(product.id) ?? [])
        .map((modifierGroupId) => modifierGroupMap.get(modifierGroupId)?.name)
        .filter((value): value is string => Boolean(value));
      const relatedOverrides = branchProductOverridesMap.get(product.id) ?? [];

      return {
        id: product.id,
        name: product.name,
        category: relatedCategory?.name ?? "Sin categoria",
        description: product.description,
        basePrice: formatCurrency(product.base_price),
        status: product.status === "active" ? "Activo" : "Draft",
        tags: product.tags ?? [],
        modifierGroups: relatedModifierGroups,
        branchStatuses: relatedOverrides.map((override) => ({
          branchName: branchMap.get(override.branch_id)?.name ?? "Sucursal",
          availability: mapAvailabilityStatus(override.availability_status),
          price: formatCurrency(override.price_override ?? product.base_price),
          prepTime: override.prep_time_minutes ? `${override.prep_time_minutes} min` : "-",
        })),
      };
    });

    const mappedCategories: CatalogCategory[] = categories.map((category) => ({
      name: category.name,
      itemCount: mappedProducts.filter((product) => product.category === category.name).length,
      visibility: category.is_visible ? "Publica" : "Oculta",
    }));

    const modifierUsageCount = productModifierGroups.reduce<Map<string, number>>((map, relation) => {
      map.set(relation.modifier_group_id, (map.get(relation.modifier_group_id) ?? 0) + 1);
      return map;
    }, new Map());

    const mappedModifierGroups: CatalogModifierGroup[] = modifierGroups.map((group) => ({
      name: group.name,
      type: group.selection_type === "single" ? "Single" : "Multiple",
      appliedTo: `${modifierUsageCount.get(group.id) ?? 0} productos`,
    }));

    if (!mappedProducts.length && !mappedCategories.length && !mappedModifierGroups.length) {
      return MOCK_CATALOG_MODULE;
    }

    return {
      products: mappedProducts.length ? mappedProducts : catalogProducts,
      categories: mappedCategories.length ? mappedCategories : catalogCategories,
      modifierGroups: mappedModifierGroups.length ? mappedModifierGroups : catalogModifierGroups,
      source: "supabase",
    };
  } catch {
    return MOCK_CATALOG_MODULE;
  }
});
