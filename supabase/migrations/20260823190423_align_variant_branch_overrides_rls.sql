-- branch_product_variant_overrides_manage was introduced with a stricter policy
-- (owner/manager only) than its product-level sibling, branch_product_overrides_manage
-- (has_branch_access, i.e. any active branch membership -- role gating for this action
-- happens in the application layer, same as every other branch-scoped catalog write).
-- That mismatch would silently block branch_manager writes at the DB layer even once the
-- admin UI grants them the ability to edit per-branch variant overrides. Align the two
-- policies so branch-level catalog writes are consistently gated.
drop policy if exists branch_product_variant_overrides_manage on public.branch_product_variant_overrides;

create policy branch_product_variant_overrides_manage
on public.branch_product_variant_overrides
for all
to authenticated
using (public.has_branch_access(branch_id))
with check (public.has_branch_access(branch_id));
