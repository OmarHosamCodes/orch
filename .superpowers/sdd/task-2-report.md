# Task 2 Report: Checkout slugs `agency` and `agency-unlimited`

## Status

DONE_WITH_CONCERNS

## TDD

| Phase | Result |
|-------|--------|
| RED | `bun test packages/api/src/routers/billing/service.test.ts` — 13 pass, 2 fail. Seat checkout still sent `polar-pro` (and derived seats 2); `confirmCheckout` of `polar-unlimited` threw `BAD_REQUEST` ("This checkout product is not supported for team billing.") |
| GREEN | Same command — 15 pass, 0 fail |

Fixture note: the brief’s Unlimited seat test called `applyPaidPlan(..., { seats: 2 })` with no Polar subscription id. `resolveTeamBillingSnapshot` treats Unlimited without `polarSubscriptionId` as 1 seat (lifetime overlay), so derived checkout quantity is 2 not 3. The test sets `polarSubscriptionId: "sub_unl_seats"` so stored seats (2) + 1 = 3 as asserted.

Env: `Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = "polar-unlimited"` is set at the top of the test file (catalog/`env` are import-cached).

## Changes

- `packages/auth/src/index.ts`: Better Auth checkout products from `polarCheckoutProducts(resolvePolarCatalog(env))` (`agency` / `agency-unlimited`). Removed `{ productId: env.POLAR_PRODUCT_PRO, slug: "pro" }`.
- `packages/api/src/routers/billing/service.ts`: `createSeatCheckout` uses Unlimited product id when `getTeamBilling` plan is `agency_unlimited`; else Agency. `confirmCheckout` treats a non-null `planForPolarProductId(...)` as an Agency SKU (credit pack path still first).
- `packages/api/src/routers/billing/service.test.ts`: Unlimited seat checkout + Unlimited confirm tests.
- Web checkout slug: `checkoutBilling(slug: "agency" | "agency-unlimited" = "agency")`. Paywall and settings unpaid path call `checkout("agency")`. Removed Slice 5 comment on `agency-paywall-container.tsx`.
- Type-only call-site updates: `landing-pricing.tsx` and `app-shell-rail.tsx` `checkout("pro")` → `checkout("agency")` so `check-types` passes. No landing table or Pro-copy rewrite (Tasks 3–4).

## Checks

- `bun test packages/api/src/routers/billing/service.test.ts` — 15 pass
- `bun run check-types` — pass
- `bun run check` — fails on pre-existing `golden-view-no-hooks` (out of scope)

## Commit

`feat(billing): check out Agency and Unlimited Polar slugs`

## Concerns

- Unlimited seat fixture needed `polarSubscriptionId` for the brief’s `seats: 3` assertion (see TDD).
- Landing/chrome still show Pro copy; only the checkout slug was changed so types compile.
- Paywall slug is a one-line swap; no billing-queries unit test.
- `createSeatCheckout` still derives quantity from `deriveInviteSeatCheckoutQuantity` (client `seats` ignored), matching existing tests.
