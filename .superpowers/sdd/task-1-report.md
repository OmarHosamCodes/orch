# Task 1 Report: Polar product ids map to Agency vs Unlimited

## Status

DONE

## TDD

| Phase | Command | Result |
|-------|---------|--------|
| RED | Reverted production files to HEAD (`isPolarProProduct` / comma-split `POLAR_PRODUCT_PRO` only); removed `polar-catalog.ts`. Ran `bun test packages/env/src/polar-catalog.test.ts packages/api/src/billing.test.ts` | Catalog: `Cannot find module './polar-catalog'`. Billing: Unlimited overlay expected `"pro"`, received `"free"`. |
| RED | `bun test packages/api/src/billing-team.test.ts --test-name-pattern "writes agency_unlimited"` | Snapshot stayed `trial` / `seats: 1` / `orchMessagesIncluded: 5` (Unlimited product ignored). |
| GREEN | Restored catalog + `applyPolarSnapshot` / `normalizeBillingState`. Same three files. | `polar-catalog.test.ts` + `billing.test.ts`: 8 pass. `billing-team.test.ts`: 46 pass (including Unlimited snapshot). |

## Changes

- `packages/env/src/polar-catalog.ts`: `resolvePolarCatalog`, `planForPolarProductId`, `polarCheckoutProducts`. Agency id = `POLAR_PRODUCT_AGENCY` else first `POLAR_PRODUCT_PRO` id; Unlimited = `POLAR_PRODUCT_AGENCY_UNLIMITED`. Credit-pack ids do not map.
- `packages/env/src/polar-catalog.test.ts`: Agency override vs PRO fallback (verbatim brief cases).
- `packages/env/src/server.ts`: optional `POLAR_PRODUCT_AGENCY` / `POLAR_PRODUCT_AGENCY_UNLIMITED`; keep `POLAR_PRODUCT_PRO` required; re-export catalog helpers.
- `.env.example`: production Polar SKUs (Agency fallback `ee8722e7-…`, Unlimited `a72406dd-…`, credits `db04a245-…`). Did not recreate products via Polar MCP.
- `packages/api/src/billing-team.ts`: deleted `isPolarProProduct`; `applyPolarSnapshot` writes `agency` or `agency_unlimited` from `planForPolarProductId`.
- `packages/api/src/billing.ts`: Polar overlay when catalog plan is non-null (Agency **or** Unlimited still `tier: "pro"`).
- Tests set `Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = "polar-unlimited"` at file top (`billing.test.ts` / `billing-team.test.ts`) because env is cached at import.

Out of scope (later tasks): landing, checkout slugs in auth, chrome copy. Did not rename Orch model-preset Pro. Did not commit `apps/web/src/pages/privacy-page.tsx` or `.superpowers/sdd/*`.

## Commit

`2b158058 feat(billing): map Polar Agency and Unlimited product ids`

## Self-review

- Layering: catalog lives in env; API services consume `resolvePolarCatalog(env)` — no Polar MCP / no SKU recreation.
- Fallback: without `POLAR_PRODUCT_AGENCY`, first comma-separated `POLAR_PRODUCT_PRO` id is Agency; Unlimited stays null until env is set.
- Inactive Polar (`canceled` / `revoked`) still no-ops via `plan === null`.
- Pre-existing golden-view-no-hooks failures not touched.

## Concerns

None.
