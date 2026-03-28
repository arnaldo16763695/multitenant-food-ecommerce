<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

This file guides coding agents working in `C:\Users\Vit\Desktop\apps\vz-food`.

## Project Snapshot

- Stack: `Next.js 16`, `React 19`, `TypeScript`, `Tailwind CSS 4`, `ESLint 9`.
- Package manager currently in use: `npm` (`package-lock.json` is present).
- Path alias: `@/*` maps to the repository root.
- Current app structure uses the App Router under `app/`.
- No project-specific Cursor rules were found in `.cursor/rules/` or `.cursorrules`.
- No Copilot instructions were found in `.github/copilot-instructions.md`.
- `CLAUDE.md` delegates to this file, so keep this file accurate and current.

## Commands

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Create production build: `npm run build`
- Start production server: `npm run start`
- Run lint: `npm run lint`

## Tests

- There is currently no dedicated test runner configured in `package.json`.
- Do not claim tests passed unless you actually added and ran a real test setup.
- If you add a test framework later, update this file immediately.
- Single-test command: not available yet because no test runner is configured.
- If Vitest is added later, prefer `npx vitest run path/to/test-file.test.ts`.
- If Jest is added later, prefer `npx jest path/to/test-file.test.ts`.
- If Playwright is added later, prefer `npx playwright test path/to/spec.ts`.

## Working Style

- Be senior, analytical, critical, direct, and kind.
- Default to simple, maintainable solutions over clever ones.
- Keep scope tight; do not overbuild for hypothetical future requirements.
- Build with SaaS, multi-tenant boundaries, and future mobile support in mind.
- Prefer scalable decisions only when they do not add unnecessary complexity today.

## Planning Before Editing

- Read the relevant files before making claims about existing behavior.
- Inspect nearby files to match local patterns before creating new abstractions.
- For changes that affect architecture, data flow, auth, tenancy, or ordering logic, understand the surrounding code first.
- If the repo lacks an established pattern, choose a clear convention and apply it consistently.

## Imports

- Prefer `@/` imports for internal modules instead of deep relative paths when practical.
- Keep imports grouped in this order: external packages, internal modules, styles/assets.
- Separate import groups with a single blank line when there are multiple groups.
- Prefer `import type` for type-only imports when it improves clarity.
- Avoid unused imports; remove them immediately.
- Do not create barrel files unless they clearly improve developer ergonomics.

## TypeScript

- Respect `strict` mode at all times.
- Prefer explicit domain types for business data.
- Avoid `any`; use `unknown`, generics, or well-defined interfaces/types instead.
- Narrow unknown values before using them.
- Prefer readonly data where it makes intent clearer.
- Model nullable values honestly; do not hide them with unsafe casts.
- Use type assertions sparingly and only when you can justify them from trusted runtime guarantees.

## Naming

- Components: `PascalCase`
- Hooks: `camelCase` with `use` prefix
- Functions and variables: `camelCase`
- Types, interfaces, and enums: `PascalCase`
- Constants with stable semantic meaning: `UPPER_SNAKE_CASE`
- File names: follow the surrounding convention; for app routes, use Next.js routing conventions.
- Use names that reflect business meaning, not temporary implementation details.

## React and Next.js

- Prefer Server Components by default; opt into client components only when interactivity requires it.
- Keep route files thin; move reusable logic into `lib/`, `components/`, or other focused modules.
- Avoid putting heavy business logic directly in page components.
- Keep data fetching close to the server boundary when possible.
- Be deliberate with caching, dynamic rendering, and server/client boundaries.
- When using Next.js features that may have changed across versions, verify current docs first.

## State Management

- Use local React state for local UI concerns.
- Use Zustand only for shared client state that genuinely needs it.
- Do not move server state into Zustand without a strong reason.
- Keep business rules out of UI state stores when possible.

## Styling

- Use Tailwind utility classes consistently and keep class lists readable.
- Group classes roughly by layout, spacing, typography, color, and state.
- Extract repeated UI patterns into components instead of duplicating long class strings everywhere.
- Preserve the product's intended visual direction; avoid generic, lifeless UI.
- For admin surfaces, align with `shadcn/ui` patterns when they are introduced.
- For storefront surfaces, prefer custom Tailwind styling over generic dashboard aesthetics.

## Comments

- Write code comments in English only.
- Add comments when they help a human maintainer understand non-obvious logic.
- Good candidates for comments: business rules, multi-tenant constraints, workarounds, edge-case handling, security assumptions, and unusual framework behavior.
- Comment the `why`, not the obvious `what`.
- Do not add filler comments that merely restate the code.
- If a block needs too much explanation, prefer refactoring first and then add a short clarifying comment if still needed.
- Preserve useful existing comments unless they are outdated.

## Code Organization

- Keep files focused on one clear responsibility.
- Avoid giant components, giant functions, and mixed UI/business/data-access files.
- Separate concerns into clear layers when useful: UI, validation, domain logic, data access, and utilities.
- Prefer composition over deeply nested conditionals and tangled branching.
- Introduce abstractions only after repetition or clear conceptual reuse appears.
- Make the code easy for a human developer to debug and extend.

## Error Handling

- Fail clearly at system boundaries such as user input, network calls, storage, auth, and external APIs.
- Do not silently swallow errors.
- Surface actionable error messages for developers.
- Avoid defensive noise for impossible states unless there is a real runtime risk.
- Use framework-native error handling patterns when available.
- Keep user-facing messages simple; keep developer diagnostics precise.

## Data and Business Logic

- Keep business rules centralized instead of scattering them across components.
- For anything related to orders, branches, tenants, pricing, availability, or permissions, prioritize correctness over speed of implementation.
- Prefer snapshots for transactional records when historical correctness matters.
- Be explicit about tenant and branch boundaries in data models and queries.

## Editing Rules

- Match the existing formatting style in nearby files.
- Use ASCII by default unless the file already justifies other characters.
- Do not add dependencies casually; each new dependency should solve a real problem.
- Avoid broad refactors unless they are required for the requested work.
- Do not rewrite unrelated files for style consistency alone.
- Keep diffs reviewable and intentional.

## Verification

- Run `npm run lint` after meaningful code changes when feasible.
- Run `npm run build` for broader verification when changes affect routing, types, config, or production behavior.
- If you cannot run a verification step, say so clearly.
- Never report success for commands you did not execute.

## Documentation Updates

- Update this file when commands, tooling, architecture conventions, or workflows change.
- If you add tests, add the exact suite command and a single-test example here.
- If you add Cursor or Copilot rules later, mirror their impact here so agents have one reliable summary.

## Delivery Expectations

- Keep responses concise but useful.
- Explain what changed, where, and why.
- Mention verification performed.
- Suggest next steps only when they are natural and actionable.
- Be honest about ambiguities, tradeoffs, and unresolved risks.
