# Task 5 Report: Slice 5 verification

## Status

DONE_WITH_CONCERNS

HEAD at start: `9c5dd062` (`from-brainiac-to-orch`). Tasks 1–4 already committed. This task added Polar env-example docs only.

## Step 1 — targeted tests

Command:

```bash
bun test packages/env/src/polar-catalog.test.ts packages/api/src/billing.test.ts packages/api/src/billing-team.test.ts packages/api/src/routers/billing/service.test.ts apps/web/src/components/marketing/landing-pricing-copy.test.ts apps/web/src/features/billing/agency-plan-label.test.ts
```

**PASS** — 77 pass, 0 fail, 182 expect() calls, 6 files (~20s).

Notable cases:

- Unlimited Polar product → `agency_unlimited` (`billing-team` + `confirmCheckout`)
- Seat checkout for Unlimited uses Unlimited product
- Leftover owner CTA is `Subscribe — 1 seat`, not Manage billing
- Trial is not treated as paid (`landingAgencyCta` / `isPaidAgencyPlan`)
- Agency env vs `POLAR_PRODUCT_PRO` fallback
- No landing feature string equals `Pro`

## Step 2 — Pro copy / checkout slug search

Searched billing, marketing, paywall, rail, user-settings, auth Polar plugin, `polar-catalog`.

**PASS (user-visible billing copy):** no `Get Pro`, `Upgrade to Pro`, or `Pro plan`. Remaining `\bPro\b` hits in those areas are test assertions that copy must not contain Pro.

**PASS (checkout slugs):** Better Auth products are `agency` | `agency-unlimited` via `polarCheckoutProducts`. Client checkout helper is `checkoutBilling(slug: "agency" | "agency-unlimited")`. Call sites: paywall, rail leftover CTA, settings subscribe, landing Agency/Unlimited CTAs. No slug `"pro"`.

Ignored as instructed: model-preset `pro`, workspace pros/cons, internal `tier: "pro"` / `isPro` / `ownerTier: "pro"` (not user-visible labels).

## Step 3 — types

```bash
bun run check-types
```

**PASS** — turbo 8/8 successful.

## Step 4 — conventions

```bash
bun run check:conventions
```

**FAIL (pre-existing, out of scope):**

- `apps/web/src/features/clients/agency-clients-table-view.tsx:161` golden-view-no-hooks `useRef()`
- `apps/web/src/features/reports/agency-report-studio-options-view.tsx:108` golden-view-no-hooks `useState()`
- `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx:82` golden-view-no-hooks `useRef()`
- `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx:84` golden-view-no-hooks `useEffect()`

No Slice 5 / billing / landing convention violations.

## Step 5 — golden inventory

```bash
bun run check:golden
```

**PASS** — 1526 artifacts, 28 domains. No inventory commit.

## Step 6 — check

```bash
bun run check
```

**FAIL** at `check:conventions` (same four golden-view-no-hooks as Step 4). Script order: oxlint → conventions → knip → golden → oxfmt, so knip/oxfmt did not run in this invocation.

`bunx oxlint` **PASS** (exit 0). Pre-existing view failures recorded only; not fixed.

## Step 7 — product confirmations

| Check | Result |
|---|---|
| Agency slug checkout | `authClient.checkout({ slug: "agency" })` from leftover paywall, rail, settings, landing Agency CTA |
| Unlimited product → `agency_unlimited` | Tests + `planForPolarProductId` |
| Leftover landing CTA `Subscribe — 1 seat` | Copy + test; paywall/rail/settings match |
| Trial not treated as paid | `isPaidAgencyPlan` only `agency` / `agency_unlimited` |

## Landing `#pricing` route

There is **no** `/pricing` route (`apps/web/src/routes` has `/`, `/login`, `/terms`, `/privacy`, authenticated app).

`LandingPricing` (`id="pricing"`) lives in `apps/web/src/components/marketing/landing-pricing.tsx` and is **not imported** by `LandingPage` / `LandingHero`. `/` is hero-only.

Footer still links to `/#pricing` (`marketing-page-shell.tsx`). Polar checkout `returnUrl` is `new URL("/pricing", primaryCorsOrigin)` in `packages/auth/src/index.ts` — that path has no page.

Intended in-page target remains `/#pricing` **if** the section is mounted; it currently is not.

Browser check skipped (optional; do not block).

## Env example (Task 1 minor)

Synced `apps/server/.env.example` to match root Polar SKUs:

- `POLAR_PRODUCT_PRO` Agency fallback `ee8722e7-…` (was old Pro-only `bc88ffdc-…`)
- commented `POLAR_PRODUCT_AGENCY`
- `POLAR_PRODUCT_AGENCY_UNLIMITED` `a72406dd-…`
- `POLAR_PRODUCT_ORCH_CREDITS` `db04a245-…`

Railway still needs `POLAR_PRODUCT_AGENCY_UNLIMITED` in production for Unlimited checkout in the Better Auth plugin. Not changed here.

## Commit

`4289bcd9` — `chore(env): document Agency and Unlimited Polar product ids`

Did **not** commit `apps/web/src/pages/privacy-page.tsx` or `.superpowers/sdd/*`.

## Spec coverage (self-review)

| Spec requirement | Result |
|---|---|
| Checkout slugs `agency` / `agency-unlimited` | Pass |
| Polar Agency vs Unlimited product ids | Pass (tests + catalog) |
| Landing headline + Trial/leftover vs Agency vs Unlimited | Copy/tests pass; **UI not on `/`** |
| Drop “Pro” billing copy | Pass (search) |
| Paywall Subscribe — 1 seat still Agency 1-seat | Pass |
| Seat quantity Polar `seats` / Unlimited SKU | Pass (service tests) |
| Credit packs unchanged | Pass (unknown product reject / credit tests) |
| Model-preset Pro unchanged | Untouched |

## Concerns

1. `LandingPricing` is unused; `/` and `/pricing` do not show `#pricing`. Footer `/#pricing` and Polar `returnUrl` `/pricing` are stale relative to the live landing.
2. `bun run check` / `check:conventions` fail on four pre-existing `golden-view-no-hooks` views (out of scope).
3. Production Railway must still set `POLAR_PRODUCT_AGENCY_UNLIMITED` for Unlimited checkout to appear in Better Auth.
4. No browser visual pass this task.

---

## Follow-up pass — Important finding (LandingPricing unused)

**Status:** DONE  
HEAD after commit: `0abbde27` (`from-brainiac-to-orch`).

### Changes

1. `LandingPage` now renders `LandingPricing` after `LandingHero` and passes `isAuthenticated`. `id="pricing"` stays on the section. Hash scroll uses existing `landingScrollTargetId` / `scrollToLandingTarget` (features index UI not restored). No Polar SDK on the page.
2. Polar checkout `returnUrl` is `${primaryCorsOrigin}/#pricing`. `successUrl` remains `/billing/success?checkout_id={CHECKOUT_ID}`.

Did **not** commit `apps/web/src/pages/privacy-page.tsx` or `.superpowers/sdd/*`. `check:golden` not rerun (no inventory path add/move).

### Tests

```bash
bun test apps/web/src/components/marketing/landing-pricing-copy.test.ts
```

**PASS** — 6 pass, 0 fail (copy cases plus LandingPage mounts `LandingPricing` after the hero).

### Browser

`http://localhost:7001/#pricing` (Playwright + system Chrome, `#pricing` scrolled into view):

- Headline: **Free to try. Agency when the trial ends.**
- Columns: **Trial / leftover**, **Agency**, **Agency Unlimited**

Cursor IDE browser MCP had no usable tab; confirmed via live HTML (`id="pricing"` in `/`) and the section screenshot.

### Commit

`0abbde27` — `fix(marketing): show the Agency pricing table on the live landing`
