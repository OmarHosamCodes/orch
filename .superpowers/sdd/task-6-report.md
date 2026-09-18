# Task 6 report: Web capability flags (editor records vs owner rates)

## Status
Complete.

## Summary
- Added `agencyTeamCapabilities()` in `apps/web/src/features/shared/agency-team-capabilities.ts` (`canEditRecords`, `canEditRates`, `isOwner`).
- Wired clients/projects hooks and view models; views bind create/archive/name/icon/add-project to `canEditRecords` and rate/currency/category/commercial forms to `canEditRates` / `isOwner`.
- `saveClientEdits` / `saveCommercial` omit `category`, `billableRateAmount`, and `currency` when `canEditRates` is false (editor name-only saves).
- My Tasks edit dialog exposes `canEditRecords`; billable rate remains `isOwner`.
- Money billing UI unchanged (`canViewBilling` from API).

## Tests
- `bun test apps/web/src/features/clients/hooks/use-agency-clients-table.capabilities.test.ts` — 3 pass (editor/owner/viewer caps).

## Checks
- `bun run check:conventions` — only pre-existing `golden-view-no-hooks` on unrelated views (+ clients table `useRef`, out of scope).
- `check-types` — pre-existing `@orch/api` `ORPCError` generic error unrelated to this task.

## Commits
- `feat(agency): let editors open client and project create in the UI`

## Concerns
- Editors see a reduced commercial popover (name only); category/rate remain read-only via API if omitted from patch.
- Segment-level “New client/project” chrome outside these views may still be owner-gated elsewhere — not in this task file list.

---

## Follow-up: My Tasks edit dialog (`canEditRecords`)

- `canSubmitMyTasksEditDialog()` gates submit on `canEditRecords`; hook `handleSubmit` no-ops for viewers.
- Container passes `canEditRecords` prop to view; fields/footer read-only for viewers (Close only, no Save); rate UI stays `isOwner`.
- Tests: `agency-my-tasks-edit-draft.test.ts` — `canSubmitMyTasksEditDialog` viewer/editor cases.

## Commits (follow-up)
- `fix(agency): gate my-tasks edit dialog on editor records`
