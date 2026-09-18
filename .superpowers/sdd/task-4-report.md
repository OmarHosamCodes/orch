# Task 4 Report: Drop Pro billing copy in chrome

## Status

DONE_WITH_CONCERNS

## TDD

| Phase | Result |
|-------|--------|
| RED | `bun test apps/web/src/features/billing/agency-plan-label.test.ts` — 0 pass, 1 fail (`Cannot find module './agency-plan-label'`) |
| GREEN | Same command — 2 pass (`leftover` → `Leftover`, `agency_unlimited` → `Agency Unlimited`; also `trial` → `Trial`, `agency` → `Agency`) |

## Changes

- `apps/web/src/features/billing/agency-plan-label.ts`: `agencyPlanLabel` (`Trial` \| `Leftover` \| `Agency` \| `Agency Unlimited`) and `isPaidAgencyPlan`. Undefined plan labels as `Trial` (never Pro/Free).
- `apps/web/src/features/billing/agency-plan-label.test.ts`: brief leftover/Unlimited test plus trial/agency mapping.
- `apps/web/src/features/app-shell/app-shell-rail.tsx`: leftover-only CTA `Subscribe — 1 seat`, still `checkout("agency")`. No `!isPro`.
- `apps/web/src/features/app-shell/app-shell-account-menu.tsx`: sidebar subtitle `{agencyPlanLabel(plan)}` instead of `Pro plan` / `Free plan`. Icon-dot still uses `isPro` (no displayed word Pro). No Polar.
- `apps/web/src/features/user-settings/hooks/use-user-settings-modal-actions.ts`: pass `plan`; `onBillingAction` uses `isPaidAgencyPlan(plan)` (portal vs `checkout("agency")`). Dropped `isPro`/`tier` from the view model.
- `apps/web/src/features/user-settings/views/user-settings-modal-view.tsx`: badge `agencyPlanLabel(plan)`; unpaid `Subscribe — 1 seat` + `Subscribe to keep Tracker, projects, money, and people for this agency.`; paid `Manage billing` + `Manage billing, invoices, and seats.`
- `docs/golden-file-source-inventory.md`: inventory rows for the new label module.

Did not rename Orch model-preset Pro. Did not touch workspace pros/cons. `deriveBillingState.isPro` unchanged.

## Checks

- `bun test apps/web/src/features/billing/agency-plan-label.test.ts` — 2 pass
- `bun run check-types` — pass
- `bun run check:golden` — pass
- oxlint on the changed chrome/billing files — pass
- `bun run check` / `check:conventions` — same four pre-existing `golden-view-no-hooks` failures (out of scope)
- No browser verification of rail/settings copy (auth chrome)

## Commit

`016cc3f4` `fix(billing): drop Pro from rail and settings copy`

## Concerns

- Rail Subscribe CTA remains only on the mobile drawer overlay, not the desktop rail footer (that was the existing Get Pro slot).
- Account icon variant still uses `isPro` for a status dot; the word Pro is not shown.
- `agencyPlanLabel(undefined)` returns `Trial` while billing.state is loading.
- Settings unpaid CTA is `Subscribe — 1 seat` for trial as well as leftover (`isPaidAgencyPlan`, not leftover-only).
- Pre-existing `golden-view-no-hooks` and knip unused-export noise unchanged.
- Did not commit `privacy-page.tsx` or `.superpowers/sdd/*`.


## Follow-up: undefined plan label (Important)

`agencyPlanLabel(undefined)` now returns `Leftover` (plan/brief default) so rail/settings do not flash Trial while `deriveBillingState` still has plan undefined. No other chrome behavior changed.

### Command + output

```
bun test apps/web/src/features/billing/agency-plan-label.test.ts
```

```
bun test v1.4.0 (34cbb9a40)

apps/web/src/features/billing/agency-plan-label.test.ts:
(pass) agencyPlanLabel > leftover is Leftover, not Free or Pro [2.01ms]
(pass) agencyPlanLabel > maps trial and agency without Pro or Free [0.07ms]
(pass) agencyPlanLabel > undefined plan is Leftover while billing is loading [0.02ms]

 3 pass
 0 fail
 5 expect() calls
Ran 3 tests across 1 file. [126.00ms]
```

### Commit

`9c5dd062` `fix(billing): keep Leftover label while billing plan is loading`

Did not commit `privacy-page.tsx` or `.superpowers/sdd/*`.
