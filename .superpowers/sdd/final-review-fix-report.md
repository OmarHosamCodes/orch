# Slice 4 Whole-Branch Important Fix Report

Repository: `/home/omar/Projects/brainiac`  
Branch: `from-brainiac-to-orch`  
Starting HEAD: `29a5e3cd`  
Fix commit: `7f0c0159 fix(agency): align editor record chrome`

## Scope and findings

### 1. Primary create chrome

- Segment-header **New client** and **New project** controls now derive `canEditRecords` from the selected team role.
- Viewer contexts neither render the controls nor expose working `openNewClient` / `openNewProject` actions.
- Editor client creation omits `category`, `billableRateAmount`, and `currency`, preserving the API's owner-only commercial-field split.
- Owner client creation retains category and rate controls.
- The tracker task chooser now gates direct **Create project** and **Create task** controls, handlers, and dialogs with `canEditRecords`.
- Existing table empty-state, row, and detail create controls were confirmed to already use `canEditRecords`.

### 2. Dashboard / time summary

- No web consumer of `agencyOps.summary.list` / `getAgencyTimeSummary` remains in the repository.
- The Dashboard uses the separate owner-only `agencyOps.reports.dashboard` aggregate.
- Its hook previously enabled that owner-only query for every role. It now loads team capability first and only enables the aggregate for owners; viewers and editors do not issue a request that would 403.
- The API authorization was not lowered.

### 3. Tags, templates, and journey

- Tag selection remains available to viewers for their own entries, but tag creation chrome is now present only when `canEditRecords` is true.
- The tag capability is propagated through tracker, time-entry log, grouped row, and report-entry detail view models without adding hooks to views.
- Project journey editing is read-only unless `canEditRecords`; editors retain add, rename, reorder, and remove controls.
- No project-template write UI exists in the web app. Template listing/selection remains readable, while the direct project create path that consumes templates is editor-gated.
- Added an editor-positive API smoke for `createAgencyProjectWithJourney`.

### 4. Client/project icon control

- The project-header icon picker was confirmed to use `canEditRecords`.
- No separate client icon picker exists in the current clients feature.
- Rate controls remain owner-only through `canEditRates` / `isOwner`.

### 5. `updateAgencyProjectTask`

- The service already authorizes editor/owner non-rate updates through `canEditAgencyProjectTask`.
- Task rate patches remain explicitly owner-only.
- Added integration assertions that an editor can rename a task and receives `FORBIDDEN` when patching `billableRateAmount` / `currency`.
- Existing My Tasks UI tests still prove viewer submit denial and editor submit success.

## Verification

Required API command:

```text
bun test packages/api/src/lib/team-membership.test.ts packages/api/src/routers/agency-ops/clients/service.rbac.test.ts packages/api/src/routers/agency-ops/projects/service.rbac.test.ts packages/api/src/routers/agency-ops/time-tracking/service.rbac.test.ts packages/api/src/routers/agency-ops/billing/money-scoreboard-service.rbac.test.ts
```

Result: **PASS — 14 pass, 0 fail, 15 expect() calls across 5 files.**

Web/task capability command:

```text
bun test apps/web/src/features/clients/hooks/use-agency-clients-table.capabilities.test.ts apps/web/src/features/task-management/agency-my-tasks-edit-draft.test.ts packages/api/src/routers/agency-ops/tasks/task-edit-authz.test.ts
```

Result: **PASS — 16 pass, 0 fail, 30 expect() calls across 3 files.**

Type checking:

```text
bun run check-types
```

Result: **PASS — 8/8 tasks successful.**

Changed-file lint:

```text
bunx oxlint <13 changed source/test files>
```

Result: **PASS — no diagnostics.**

Conventions:

```text
bun run check
bun run check:conventions
```

Result: **EXPECTED OUT-OF-SCOPE FAILURE** at the same four pre-existing `golden-view-no-hooks` findings:

- `apps/web/src/features/clients/agency-clients-table-view.tsx:161` — `useRef`
- `apps/web/src/features/reports/agency-report-studio-options-view.tsx:108` — `useState`
- `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx:82` — `useRef`
- `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx:84` — `useEffect`

No files were added or relocated, so `bun run check:golden` was not required.

## Self-review and exclusions

- `git diff --check` passed for changed source/test files.
- No Polar slugs, landing work, rates expansion, ledger fixtures, seat math, privacy page, or Slice 5 work was included.
- `apps/web/src/pages/privacy-page.tsx` and all pre-existing `.superpowers/sdd/*` changes were excluded from the commit.
- This report is intentionally left uncommitted per instruction.

---

## Slice 4 remaining Important fix pass

Repository: `/home/omar/Projects/brainiac`  
Branch: `from-brainiac-to-orch`  
Starting HEAD: `7f0c0159`  
Fix commit: `4d2e18c1 fix(agency): gate project tasks and viewer summaries`

### Fixes

1. **Project task write chrome.** `AgencyProjectTasks` now derives `canEditRecords` from the selected team role. The add form and delete actions are hidden for viewers and trashed projects, and both mutation handlers independently reject calls unless the actor can edit records. Task rates remain owner-only.
2. **Viewer-safe Orch time summary.** Agent time-summary requests now branch on agency role. Editors and owners retain the editor-only team summary; viewers receive a self-scoped summary built from their own range entries, with project/client/member filters applied without lowering `getAgencyTimeSummary` authorization.
3. **Focused RBAC coverage.** The time-tracking RBAC test now proves a viewer receives only their own agent summary while an editor receives the team member summary.

### Verification

Required API command:

```text
bun test packages/api/src/lib/team-membership.test.ts packages/api/src/routers/agency-ops/clients/service.rbac.test.ts packages/api/src/routers/agency-ops/projects/service.rbac.test.ts packages/api/src/routers/agency-ops/time-tracking/service.rbac.test.ts packages/api/src/routers/agency-ops/billing/money-scoreboard-service.rbac.test.ts
```

Output: **PASS — 15 pass, 0 fail, 18 expect() calls across 5 files.**

Focused agent summary command:

```text
bun test packages/api/src/routers/agency-ops/time-tracking/service.rbac.test.ts
```

Output: **PASS — 4 pass, 0 fail, 6 expect() calls.**

No project-task component unit test exists, and repository testing conventions explicitly exclude component render tests. The shared role-capability helper already has focused viewer/editor/owner coverage.

Type checking:

```text
bun run check-types
```

Output: **PASS — 8/8 tasks successful.**

Changed-file lint:

```text
bunx oxlint apps/web/src/features/task-management/task-list/agency-project-tasks.tsx packages/api/src/routers/agent/service.ts packages/api/src/routers/agency-ops/time-tracking/service.rbac.test.ts
```

Output: **PASS — no diagnostics.**

Repository checks:

```text
bun run check
bun run check:conventions
```

Output: **EXPECTED OUT-OF-SCOPE FAILURE** at the same four pre-existing `golden-view-no-hooks` findings:

- `apps/web/src/features/clients/agency-clients-table-view.tsx:161` — `useRef`
- `apps/web/src/features/reports/agency-report-studio-options-view.tsx:108` — `useState`
- `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx:82` — `useRef`
- `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx:84` — `useEffect`

No files were added or relocated, so `bun run check:golden` was not required.

### Exclusions

- No Slice 5, Agency Dashboard editor expansion, ledger fixture, Polar slug, landing, or privacy-page work was included.
- `apps/web/src/pages/privacy-page.tsx` and all `.superpowers/sdd/*` changes remain uncommitted.
