# Task 3 Report: Landing pricing table

## Status

DONE_WITH_CONCERNS

## TDD

| Phase | Result |
|-------|--------|
| RED | `bun test apps/web/src/components/marketing/landing-pricing-copy.test.ts` — 0 pass, 1 fail (`Cannot find module './landing-pricing-copy'`) |
| GREEN | Same command — 5 pass (locked headline, leftover → Subscribe — 1 seat, trial not paid, no feature string `"Pro"`, columns include Agency Unlimited) |

## Changes

- `apps/web/src/components/marketing/landing-pricing-copy.ts`: locked headline, body, three columns, feature matrix, `isPaidAgencyPlan` / `landingAgencyCta` / `landingUnlimitedCta`. No Polar SDK or oRPC.
- `apps/web/src/components/marketing/landing-pricing-copy.test.ts`: brief tests plus Pro-string and Agency Unlimited assertions.
- `apps/web/src/components/marketing/landing-pricing.tsx`: three plan `<th>` columns (Trial / leftover, Agency, Agency Unlimited). Agency CTA from `landingAgencyCta`; Unlimited from `landingUnlimitedCta`. Checkout `checkout("agency")` and `checkout("agency-unlimited")`. Paid CTAs use `plan` from `useBilling`, not `isPro`. Trial column stays Get started / Open Canvas. Section `id="pricing"` kept. No `$0 forever Agency`.
- `scripts/generate-golden-file-inventory.mjs`: billing-domain match for `landing-pricing` no longer treats the word `checkout` in copy/CTA kinds as orchestration, so the copy module stays marketing static-presentation.
- `docs/golden-file-source-inventory.md`: regenerated (new copy + test rows; also listed already-on-disk `polar-catalog` env files and a few evidence refreshes).

## Checks

- `bun test apps/web/src/components/marketing/landing-pricing-copy.test.ts` — 5 pass
- `bun run check:golden` — pass
- `bun run check-types` — pass
- oxlint on the new/changed marketing files — pass
- Visual: Vite started at `http://localhost:7001/` (`#pricing`). Browser MCP would not attach a tab (`No browser tab available` / `Browser view not found`), so no screenshot of the table. Dev process stopped after the attempt.

## Commit

`feat(marketing): replace the Pro pricing table with Agency plans`

## Concerns

- Browser visual check of `#pricing` did not complete (MCP tab attach failed).
- Golden inventory regenerate also added `packages/env/src/polar-catalog.ts` / `.test.ts` rows and incidental evidence line updates for a few existing files.
- `landing-pricing.tsx` remains classified as billing `web-query` because it calls `useBilling`.
- Pre-existing `golden-view-no-hooks` failures not re-run (`bun run check` out of scope).
- Did not commit `privacy-page.tsx` or `.superpowers/sdd/*`.
