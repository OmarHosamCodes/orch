# Task 7 Report: Slice 4 verification

**Branch:** `from-brainiac-to-orch`  
**Starting HEAD:** `9697b933`  
**Status:** Complete with the documented pre-existing convention failures.

## What I implemented

- Verified Slice 4 editor RBAC using the exact focused command from the brief.
- Fixed the in-slice `ORPCError` return type in `packages/api/src/lib/team-membership.ts`; the error remains `FORBIDDEN` with `data.code === "insufficient_role"`.
- Added the required `canEditRecords` capability to the My Tasks dev-dialog fixture after the type fix exposed that Task 6 integration omission.
- Regenerated the golden inventory for seven new Slice 4 source/test files and one semantic-evidence refresh.
- Did not implement Slice 5 or modify Polar checkout.

## Tests and checks

### Step 1

```bash
bun test packages/api/src/lib/team-membership.test.ts packages/api/src/routers/agency-ops/clients/service.rbac.test.ts packages/api/src/routers/agency-ops/projects/service.rbac.test.ts packages/api/src/routers/agency-ops/time-tracking/service.rbac.test.ts packages/api/src/routers/agency-ops/billing/money-scoreboard-service.rbac.test.ts
```

**PASS:** 13 pass, 0 fail, 13 expect calls across 5 files.

After changing the return type, the focused membership rerun also passed:

```bash
bun test packages/api/src/lib/team-membership.test.ts
```

**PASS:** 3 pass, 0 fail, 3 expect calls.

### Task 6 web capability tests

```bash
bun test apps/web/src/features/clients/hooks/use-agency-clients-table.capabilities.test.ts apps/web/src/features/task-management/agency-my-tasks-edit-draft.test.ts
```

**PASS:** 11 pass, 0 fail, 25 expect calls across 2 files.

### Step 2

```bash
bun run check-types
```

Initial run failed on the expected `ORPCError` generic. After fixing it, a second in-slice fixture error surfaced (`canEditRecords` missing in `dev-dialogs-page.tsx`) and was fixed. Final result: **PASS**, 8/8 Turbo tasks successful.

### Step 3

```bash
bun run check:conventions
```

**FAIL (pre-existing, out of scope):** 4 `golden-view-no-hooks` violations:

- `apps/web/src/features/clients/agency-clients-table-view.tsx:161` — `useRef()` (brief listed line 160; current source reports 161)
- `apps/web/src/features/reports/agency-report-studio-options-view.tsx:108` — `useState()`
- `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx:82` — `useRef()`
- `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx:84` — `useEffect()`

### Step 4

```bash
bun run check:golden
```

Initial result: **FAIL**, 8 inventory errors (seven missing Slice 4 rows and one semantic mismatch).

```bash
node scripts/generate-golden-file-inventory.mjs && bun run check:golden
```

Final result: **PASS**, 1520 artifacts semantically validated across 28 domains.

### Step 5

```bash
bun run check
```

**FAIL (pre-existing, out of scope):** stops at `check-conventions` with the same four view-hook violations above. `oxlint` passed before that step.

Additional changed-source validation:

```bash
bunx oxlint packages/api/src/lib/team-membership.ts apps/web/src/pages/dev-dialogs-page.tsx
```

**PASS:** 0 warnings/errors.

## Step 6 confirmations

- **Editor client create:** confirmed by passing test `agency client RBAC > editor creates a client record without a rate`.
- **Editor project/task create:** confirmed by passing test `agency project RBAC > editor creates a project and a task`.
- **Editor rate is `insufficient_role`:** confirmed by passing test `agency client RBAC > editor setting a rate is insufficient_role`.
- **Viewer live timers are self-only:** confirmed by passing test `agency time tracking RBAC > viewer live timers include only themselves`.
- **Role miss is `FORBIDDEN`:** confirmed by passing tests `a viewer cannot satisfy editor and gets insufficient_role` and `an editor cannot satisfy owner and gets insufficient_role with owner message`; code returns typed `ORPCError<"FORBIDDEN", { code: "insufficient_role" }>`.
- **Scoreboard is owner-only:** confirmed by passing tests `editor cannot load the period scoreboard` and `owner can load the period scoreboard`.
- **Non-member remains `UNAUTHORIZED`:** confirmed by passing test `a non-member is still UNAUTHORIZED`.
- Task 6 web tests additionally confirmed editor record capability without rate capability, viewer denial, owner access, and editor/viewer My Tasks submit gating.

## Files changed

- `packages/api/src/lib/team-membership.ts`
- `apps/web/src/pages/dev-dialogs-page.tsx`
- `docs/golden-file-source-inventory.md`
- `.superpowers/sdd/task-7-report.md` (report only; intentionally not committed)

Unrelated dirty files, including `apps/web/src/pages/privacy-page.tsx` and other `.superpowers/sdd/*` reports, were not staged or committed.

## Commits

- `fad32edf` — `fix(agency): repair Slice 4 verification types`
- `29a5e3cd` — `chore: inventory Slice 4 RBAC files`

## Self-review findings

- Reviewed both commits and confirmed they contain only the two in-slice typing integrations and generated inventory.
- Confirmed role-miss behavior was not changed.
- Confirmed no Slice 5 or Polar checkout work was included.

## Issues or concerns

- Repository-wide `check:conventions` and `bun run check` remain red only for the four explicitly out-of-scope pre-existing view-hook violations.
