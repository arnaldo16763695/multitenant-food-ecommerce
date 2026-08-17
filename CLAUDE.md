@AGENTS.md

# Project Context — Analysis Notes

The section above (`AGENTS.md`) is the single source of truth for conventions, commands, and
working style — keep editing it there, not here, so Claude Code and any other agent tooling
(`.opencode/`) stay in sync. This section instead captures what a fresh session needs to know
about **what vz-food actually is**, derived from reading the codebase directly (routes, `lib/`,
`supabase/migrations/`), so that context doesn't need to be re-derived every time. Update this
section when the architecture shifts; don't let it silently rot.

## What this SaaS is

vz-food is a multi-tenant food-ordering platform: a platform owner runs multiple restaurant
tenants, each tenant has one or more branches, each branch has its own catalog overrides,
operating schedule, staff, and orders. Customers order through a per-tenant storefront (web) or
a customer-only mobile app (native, via `/api/mobile/*`).

## Actors & roles

- **Platform roles** (`lib/domain/platform-admin.ts`): `platform_owner`, `platform_admin`.
  Manage tenant signups/approval, tenants list, platform-wide mobile home banners, and the
  platform audit log. Surface: `app/platform/*`.
- **Tenant roles** (`lib/auth/permissions.ts`): `owner`, `manager`, `branch_manager`, `cashier`,
  `preparer`. Section access is a matrix, not a hierarchy — e.g. `preparer` only sees `kitchen`,
  `cashier` only sees `overview` + `orders`. Catalog write access is split further:
  `canManageCatalogMaster` (owner/manager only, tenant-wide catalog) vs.
  `canManageCatalogBranchOverrides` (owner/manager/branch_manager, branch-level overrides).
  Surface: `app/[tenantSlug]/admin/*` + `app/[tenantSlug]/kitchen`.
- **Customers**: storefront (cookie/SSR session) and mobile (Supabase Bearer token per the
  Mobile API Boundary rules in `AGENTS.md` — never SSR cookies for native clients).

When touching permissions, check both `lib/auth/permissions.ts` (UI section visibility) and the
actual server-side enforcement in the relevant `lib/services/*` — AGENTS.md is explicit that a
role restriction hidden only in the UI is incomplete.

## Surfaces (routes)

- `app/[tenantSlug]/...` — public storefront (`page.tsx`), `account/*` (login/register/orders),
  `bag`, `checkout`, `orders/[orderId]`, and `admin/*` (`overview`, `catalog`, `orders`,
  `branches`, `staff`, `audit`, `settings`, `onboarding`), plus `kitchen`.
- `app/auth/admin/*` — staff auth (login, forgot/reset password, setup-password, callback,
  workspace picker for staff belonging to multiple tenants).
- `app/platform/*` — platform admin: `tenants`, `signups`, `home-banners`, `audit`.
- `app/signup/business/*` — self-serve tenant signup → `business_signups` → platform approval
  → provisioning.
- `app/brands` — public marketplace brand listing.
- `app/api/admin/[tenantSlug]/catalog/*` — admin catalog + media endpoints (web-only, cookie
  auth).
- `app/api/storefront/[tenantSlug]/*` — web storefront checkout/orders (cookie auth).
- `app/api/mobile/*` — the customer-only native contract: `branches` (+ `nearby`, GPS-first),
  `brands`, `customer/me`, `home`, `storefront/[tenantSlug]/{bag,checkout,menu,orders,
  payment-settings,search}`. Documented at `/mobile-api-docs` (Swagger UI) and
  `lib/mobile/openapi.ts` (OpenAPI JSON at `/api/mobile/openapi`) — **update the OpenAPI file in
  the same change as any `/api/mobile/*` edit.**

## Domain model (see `supabase/migrations/`, table names authoritative there — not the stale
`20260412150814_remote_schema.sql`, which is a diff-style pull with no `CREATE TABLE`
statements; grep all migrations for the real, current table set)

- **Tenancy & staffing**: `tenants`, `platform_memberships`, `tenant_memberships`,
  `branch_memberships`, `business_signups`, `profiles`.
- **Branches & schedule**: `branches`, `branch_operating_windows`,
  `branch_schedule_exceptions`, `branch_schedule_exception_windows` (added 2026-08-07,
  see `lib/domain/branch-schedule.ts` / `lib/services/branch-schedule.ts`).
- **Catalog**: `categories`, `products`, `product_variants`, `product_images`,
  `modifier_groups`, `modifier_group_options`, `product_modifier_groups`,
  `branch_product_overrides`, `branch_product_variant_overrides` — tenant-wide catalog with
  branch-level overrides, variants, and modifier "semantics" (recent focus — see
  `lib/services/catalog.ts`).
- **Bag**: `customer_bag_items`, `customer_bag_item_modifiers` — persisted server-side bag
  (`lib/domain/bag.ts`, `lib/services/customer-bag.ts`).
- **Orders & payments**: `orders`, `order_items`, `order_item_modifiers`,
  `order_status_history`, `payments`, `payment_receipt_submissions`.
- **Customers**: `customers`, `customer_addresses`.
- **Platform misc**: `mobile_home_banners`, `audit_events`.

### Order lifecycle (`lib/domain/order.ts`)

- `OrderStatus`: `pending_payment → confirmed → in_preparation → ready → fulfilled`, or
  `cancelled` at any point. `fulfilled` displays as "Entregado" (delivery) or "Retirado"
  (pickup) — don't collapse that distinction in new UI copy.
- `PaymentStatus`: `pending | paid | failed | refunded`.
- Payment is **manual only** today: `mobile_payment` ("Pago móvil") or `bank_transfer`
  ("Transferencia bancaria"). Customers upload a receipt image; staff review it via
  `payment_receipt_submissions` (`reviewStatus`: `pending | rejected | accepted`, with
  `rejectionReason` and full submission history — rejecting doesn't discard the old receipt,
  see the `preserve_rejected_payment_receipt` / `drop_previous_receipt_columns` migrations).
- Before changing state-transition logic, restate explicitly which role can trigger which
  transition and where it becomes visible (kitchen board vs. admin orders vs. customer order
  page) — this is a named expectation in `AGENTS.md`'s SDD section, not optional polish.

## Local tooling

- Third-party agent skills live in `.agents/skills/` (gitignored, managed by an external
  `skills-lock.json`-based installer — not npm). They are already authored in Claude Code's
  native `SKILL.md` frontmatter format (`name`, `description`, `allowed-tools`, etc.), so a
  mirror is kept at `.claude/skills/` (also gitignored — see `.gitignore`) purely so Claude Code
  picks them up. If `.agents/skills/` changes, re-sync `.claude/skills/` the same way
  (`cp -r .agents/skills/. .claude/skills/`); don't hand-edit the mirror.
- `.opencode/` is a separate agent runtime's local config/cache — not part of the app, don't
  treat it as product code.

## Recent focus (from git history, for continuity — verify before assuming still true)

Branch operating schedules, admin login/orders UX, storefront + admin modifier semantics, and
mobile home banner management were the last few landed features. If asked to touch catalog
modifiers, branch scheduling, or the admin orders/login flow, check these recent commits first —
they're the freshest examples of the current conventions in that area.
