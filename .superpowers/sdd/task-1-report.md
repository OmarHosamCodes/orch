# Task 1 Report

## What I implemented

- Added `AgencyPlan`, `AgencyPlanLimits`, `AGENCY_PLANS`, and `AGENCY_PLAN_LIMITS`.
- Added `agencyEnabled`, `legacyTier`, and `resolvePlanAt`.
- Preserved the existing `TIERS`, `TIER_LIMITS`, and legacy helpers.
- Added focused tests covering Agency enablement, trial expiry, legacy tier mapping, and trial/client limits.

## What I tested

- `bun test packages/workspace/src/tiers.test.ts` — 4 pass, 0 fail.
- `bun run --cwd packages/workspace check-types` — passed.
- `bunx oxfmt packages/workspace/src/tiers.test.ts` — passed.

## TDD Evidence

### RED

Command:

```text
bun test packages/workspace/src/tiers.test.ts
```

Result: failed before implementation with `SyntaxError: Export named 'AGENCY_PLAN_LIMITS' not found in module .../packages/workspace/src/tiers.ts`. This was expected because the new exports did not yet exist.

### GREEN

Command:

```text
bun test packages/workspace/src/tiers.test.ts
```

Result: 4 tests passed, 0 failed, with 12 expectations.

## Files changed

- `packages/workspace/src/tiers.ts`
- `packages/workspace/src/tiers.test.ts`

## Self-review findings

- Implementation is pure and has no I/O, database, Polar, API, or later-slice behavior.
- Existing legacy tier exports remain unchanged.
- Trial expiry uses strict `now > trialEndsAt`, so the exact expiry instant remains trial as specified by the provided behavior.
- No unresolved concerns.
