# Repo Hygiene Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `bun run check` the single maintenance gate: golden-file conventions green, dead leftover features gone, duplicated waste/snapshot logic folded into existing owners, unused files/deps deleted, then unused + golden inventory added to the same check CI already runs.

**Architecture:** Deletion waves first; no new workspace package and no schema/API renames. Fold duplicates only into files that already own the invariant (`waste-helpers.ts`, a small `query-snapshots.ts` next to the existing query cache). Golden-file stay empty-allowlist: lift orchestration out of `*-view.tsx`. Live compat stays (`/dashboard` → `/canvas`, `agency-legacy-redirects`, `invoices`/`payouts` router names, Tracker segment id `work`, live `features/billing/` helpers used by Money).

**Tech Stack:** Bun, oxlint/oxfmt, `scripts/check-conventions.mjs`, knip, `scripts/generate-golden-file-inventory.mjs`, TanStack Query, oRPC, existing `@orch/api` waste helpers.

## Global Constraints

- Default branch for PRs is `dev`.
- Commands are Bun only (`bun run check`, `bun run check-types`, `bun test`); never npm/pnpm/yarn.
- Golden-file layer direction: schema → API → router → service → hook → container → `*-view.tsx`. Views do not call hooks, oRPC, query, or stores. Containers call exactly one hook and import one `*-view` module.
- `GOLDEN_VIEW_ALLOWLIST` and `GOLDEN_LIB_STORE_ALLOWLIST` in `scripts/check-conventions.mjs` stay empty `Set()`s. Do not reopen them.
- Do not create `packages/agency-domain` or any new workspace package.
- Do not rename DB tables (`agency_ops_invoice`, `agency_ops_member_leave`) or oRPC namespaces (`invoices`, `payouts`).
- Do not drop Money/payout/salary/leave/invoice/tag/canvas tables, even empty ones. Production restore (2026-09-14) shows payout runs, invoice rows, off-day rows, and Canvas conversations are live; tags/knowledge are empty but still schema.
- Do not delete `payouts.getRun`, `payouts.list`, `payouts.summary`, `payouts.syncFormulaLines`, or `salaryPool.*`. Money Bills reads `payouts.list` + `salaryPool.get`; formula sync still materializes `agency_ops_payout_run` rows. Delete only the unmounted `money-payout-run*` UI files.
- Do not drop `agency_ops_salary_member_settlement` (one historical row remains; pool-level `paid_amount` is 0).
- Do not delete live Money helpers under `apps/web/src/features/billing/` except the payout-run UI slice and unused `agency-money-surface.tsx` shim.
- Do not merge `agency-ops.ts` and `agency-time-tracking.ts` stores.
- Do not migrate `enabledOptionIds` / `valueByOptionId` off money settings; production still stores both legacy option IDs and chip `formulas`.
- Product copy: Bills not Invoices; Tracker not Work; Off days not Leave; Canvas for spatial home; Expenses is a Bills filter.
- After any add/delete/move of in-scope source files: `node scripts/generate-golden-file-inventory.mjs` then `bun run check:golden`.
- Conventional commits (`fix:`, `refactor:`, `chore:`, `docs:`). Prefer one commit per task.

---

## Production validation (2026-09-14 local restore)

Dump `/tmp/brainiac-prod-20260914-083808.dump` restored into local Docker Postgres (`localhost:5440/orch`). 68 tables, 1 team (School Of Marketing), 21 users, 13 members (all `owner`). Queried aggregates only; no production credentials in git.

This plan is **code hygiene**. Production data does **not** change Tasks 1–7, but it locks the keep/delete split:

| Plan assumption | Production evidence | Verdict |
|----|----|----|
| Delete unmounted Period payout-run **UI** only | 50 `agency_ops_payout_run` (49 draft, 1 paid), 267 sections, 18 lines; Money uses `payouts.list` + `salaryPool.get`; `payouts.getRun` is cache-invalidated, not queried by Bills | **Keep API + tables.** UI-file delete is still safe. |
| Do not drop salary member settlements | 2 salary pools (30M / 26.7M EGP); 1 settlement row paid `5_000_000` while both pools have `paid_amount = 0` | **Keep table.** Historical, not dead. |
| Do not rename invoices / leave | 13 invoices `INV-0001`…`INV-0013` (12 paid, 1 draft; USD+EGP; amounts in minor units up to 18.3M); 49 off-day rows (`pto` 39, `other` 8, `sick` 2; no `team_holiday`) | **Copy-only.** Tables stay `agency_ops_invoice` / `agency_ops_member_leave`. Unused invoice statuses `sent`/`partial`/`refunded` = 0 rows — still do not migrate this round. |
| `manage=tags` → Tracker; do not drop tag schema | 0 tags, 0 time-entry tags, 0 departments | Redirect is correct. **Do not drop** `agency_ops_tag*`. |
| `manage=rates` → People | 1 member rate row (all amounts 0, EGP); 12 clients + 17 tasks have billable rates; 0 project overrides | Redirect is correct. Rates live under People / project-task inheritance. |
| Fold Reports waste through `resolveEntryWaste` | 10 945 entries: 73 `is_waste`, **0** task `is_waste` flags, 18 waste-named tasks (198 live entries), 37 waste-named projects (366 live entries); only 2 entries are both flagged and waste-named | Fold is required. Name-based waste is the bulk of production waste, not the boolean alone. Keep Create Report source filters. |
| Keep `/dashboard` + `dashboard_*` tables | 15 canvas workspaces (12 empty, 3 with nodes); 10 nodes (`standard` 9, `orchestrator` 1, all `private`); **0** `agency-operator` and **0** legacy agency blocks; 42 conversations / 100 messages (`agent` 21, `ask` 18); 17 marketplace items | Conversations and canvas are live. Knowledge `workspace_object*` = 0 — keep schema, still lift the create-menu view (Task 1). Cleanup script can stay; prod is already clean. |
| Keep money formula dual shape | Currency **EGP**, locked. `enabledOptionIds` still has 6 legacy ids (`roi-variables`, `profit-loss-share`, …) plus 10 chip formulas (`sys_*` enabled; 2 custom disabled). Number chips include `2`, `0`, `10`, `50000` | **Do not** strip `enabledOptionIds` this round. Mixed chip scales stay out of plan. |
| Expenses stay a Bills filter | 31 expenses (23 subscription / 8 one-time; 26 due / 5 paid); 24 occurrences; all have source amounts | Confirms product model; no schema rename. |
| Empty ≠ deletable | 0: contacts, reviews, capacity, templates, knowledge objects, agent proposals, time-entry tags | Leave tables. Features are wired even if unused. |

Also live and therefore **not** in this plan: tenure policy enabled (fiscal 26 Dec, 8h day, Saturday week start, 1-day weekend, 175 monthly min hours, 6.75 off-day reduce); 55 member-profile alerts; 23 reports; 1 active timer; 6 time-entry links; 1 pending applied client surcharge.

**Out of this plan (do not start):** `@orch/agency-domain`, invoice/leave schema migrations, dropping `agency_ops_salary_member_settlement` or empty tag/knowledge tables, merging giant stores, unifying three date-key parsers, moving live Money helpers into `features/money/lib/`, deleting `payouts.getRun` / `payouts.list` / formula-sync, stripping `enabledOptionIds`, removing `/dashboard` redirect, running `cleanup-agency-operator-nodes` against prod (already 0 hits).

---

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/web/src/features/task-management/task-list/agency-task-group-row-view.tsx` | Stop importing the rate popover; take a render prop so BFS cannot reach query/oRPC. |
| `apps/web/src/features/task-management/task-list/agency-task-group-row.tsx` | Informal container: render the popover and pass it into the view. |
| `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts` | Own dock-land pulse chrome; view stays props-only. |
| `apps/web/src/features/workspace-agent/workspace-agent-view.tsx` | Presentational only. |
| `apps/web/src/features/workspace-knowledge/hooks/use-canvas-knowledge-create-menu.ts` | Own radial-menu motion + Escape; view stays props-only. |
| `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx` | Presentational only. |
| `apps/web/src/components/assistant-ui/thread.tsx` | Unmount `ThreadFollowupSuggestions`. |
| `apps/web/src/features/billing/money-payout-run*.ts(x)` + `build-money-payout-run-view-model*.ts` | Delete unmounted Period payout-run UI. |
| `apps/web/src/features/shared/query-snapshots.ts` | Single snapshot/restore helper for both mutation stores. |
| `apps/web/src/features/reports/agency-report-grouping.ts` | Flat-row waste via `resolveEntryWaste`; keep Reports-only source filters. |
| `apps/web/src/features/shared/agency-legacy-redirects.ts` | `manage=rates` / `manage=tags` redirects. |
| `package.json` | Drop broken Bruno scripts; later absorb `check:unused` + `check:golden` into `check`. |
| `knip.json` | Add `apps/web/scripts/railway-ssr-server.mjs` as an entry (build copy source). |
| `docs/golden-file-source-inventory.md` | Regenerated after every add/delete/move. |

**Out of this plan (do not start):** `@orch/agency-domain`, invoice/leave schema migrations, dropping settlement/tag/knowledge tables, merging giant stores, unifying three date-key parsers, moving live Money helpers into `features/money/lib/`, deleting `payouts.getRun` / `payouts.list` / formula-sync, stripping `enabledOptionIds`, removing `/dashboard` redirect.

---

### Task 1: Make golden-file conventions green

**Files:**
- Modify: `apps/web/src/features/task-management/task-list/agency-task-group-row-view.tsx`
- Modify: `apps/web/src/features/task-management/task-list/agency-task-group-row.tsx`
- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts`
- Modify: `apps/web/src/features/workspace-agent/workspace-agent-view.tsx`
- Modify: `apps/web/src/features/workspace-knowledge/hooks/use-canvas-knowledge-create-menu.ts`
- Modify: `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx`

**Interfaces:**
- Consumes: existing `useAgencyTaskGroupRow`, `AgencyTaskRatePopover`, `useWorkspaceAgent`, `useCanvasKnowledgeCreateMenu`
- Produces: `renderRateControl?: (task: AgencyProjectTask) => ReactNode` on the group-row view; `dockLandPulse: boolean` on `WorkspaceAgentViewModel`; motion fields on `CanvasKnowledgeCreateMenuViewProps`

`bun run check:conventions` currently fails with 8 violations in 3 files. CI already runs `bun run check`, which includes this script. Empty allowlists stay empty.

- [ ] **Step 1: Write the failing convention check as the baseline**

Run: `bun run check:conventions`

Expected: FAIL, exit 1, including:

```
apps/web/src/features/task-management/task-list/agency-task-group-row-view.tsx:1 [golden-view-no-indirect-orchestration]
apps/web/src/features/workspace-agent/workspace-agent-view.tsx [golden-view-no-hooks] useRef/useState/useEffect
apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx [golden-view-no-hooks] useState/useEffect
```

- [ ] **Step 2: Lift the rate popover out of the group-row view**

The checker BFS-walks feature imports from `*-view.tsx`. Importing `agency-task-rate-popover.tsx` (which uses `useQuery` + `useAgencyOpsStore`) is the violation. A render prop does not create an import edge.

In `agency-task-group-row-view.tsx`:

1. Remove `import { AgencyTaskRatePopover } from "@/features/task-management/task-list/agency-task-rate-popover";`
2. Add `renderRateControl?: (task: AgencyProjectTask) => React.ReactNode` to `AgencyTaskGroupRowViewProps`.
3. Replace `rateControl` with:

```tsx
function rateControl(task: AgencyProjectTask) {
  return renderRateControl?.(task) ?? null;
}
```

Pass `renderRateControl` through the destructure from props (alongside `viewModel` / `renderTaskRow`).

In `agency-task-group-row.tsx` (this file is not under `containers/`, so it is not scanned as a golden container and may import both the view and the popover):

```tsx
import { AgencyTaskRatePopover } from "@/features/task-management/task-list/agency-task-rate-popover";
import {
  type AgencyTaskGroupRowProps,
  useAgencyTaskGroupRow,
} from "@/features/task-management/hooks/use-agency-task-group-row";
import { AgencyTaskGroupRowView } from "@/features/task-management/task-list/agency-task-group-row-view";
import { AgencyTaskRow } from "@/features/task-management/task-list/agency-task-row";

export type { AgencyTaskGroupRowProps } from "@/features/task-management/hooks/use-agency-task-group-row";

export function AgencyTaskGroupRow(props: AgencyTaskGroupRowProps) {
  const viewModel = useAgencyTaskGroupRow(props);
  return (
    <AgencyTaskGroupRowView
      viewModel={viewModel}
      renderTaskRow={(taskRowProps) => <AgencyTaskRow {...taskRowProps} />}
      renderRateControl={(task) => {
        if (props.mode !== "project" || !props.teamId) return null;
        return (
          <AgencyTaskRatePopover
            teamId={props.teamId}
            task={task}
            canEdit={props.canEditTaskRate ?? false}
            disabled={props.isRowPending?.(task.id) ?? false}
            quietUntilHover
          />
        );
      }}
    />
  );
}
```

Delete the old `mode !== "project" || !teamId` guard from the view; the parent owns it.

- [ ] **Step 3: Move dock-land pulse into `useWorkspaceAgent`**

Near the existing `orchPresence` selector in `use-workspace-agent.ts`, add:

```tsx
import { useEffect, useRef, useState } from "react";

const prevPresenceRef = useRef(orchPresence);
const [dockLandPulse, setDockLandPulse] = useState(false);

useEffect(() => {
  const prev = prevPresenceRef.current;
  prevPresenceRef.current = orchPresence;
  if (prev !== "thread" || orchPresence !== "dock") return;
  setDockLandPulse(true);
  const timer = window.setTimeout(() => setDockLandPulse(false), 480);
  return () => window.clearTimeout(timer);
}, [orchPresence]);
```

Add `dockLandPulse` to the returned object (type is `ReturnType<typeof useWorkspaceAgent>`, so it updates automatically).

In `workspace-agent-view.tsx`:

1. Remove `useEffect`, `useRef`, `useState` imports if unused.
2. Remove `prevPresenceRef`, `dockLandPulse` local state, and the effect.
3. Use `view.dockLandPulse` everywhere the local flag was used (`dockLandPulse && !expanded && "orch-presence-land"`).

- [ ] **Step 4: Move radial-menu motion into `useCanvasKnowledgeCreateMenu`**

Extend `CanvasKnowledgeCreateMenuViewProps` in `canvas-knowledge-create-menu-view.tsx`:

```ts
export type MenuMotionState = "hidden" | "opening" | "open" | "closing";

export type CanvasKnowledgeCreateMenuViewProps = {
  open: boolean;
  x: number;
  y: number;
  unplacedCount: number;
  motionState: MenuMotionState;
  activeKind: KnowledgeCreateKind | null;
  onActiveKindChange: (kind: KnowledgeCreateKind | null) => void;
  onClose: () => void;
  onSelect: (kind: KnowledgeCreateKind) => void;
  onOpenUnplaced: () => void;
};
```

Move `CLOSE_DURATION_MS`, the two `useState`s, and both `useEffect`s from the view into `use-canvas-knowledge-create-menu.ts`. The hook already returns the view props object; add:

```ts
const [motionState, setMotionState] = useState<MenuMotionState>(
  createMenuPoint ? "open" : "hidden",
);
const [activeKind, setActiveKind] = useState<KnowledgeCreateKind | null>(null);
const open = Boolean(createMenuPoint);

useEffect(() => {
  if (open) {
    setMotionState("opening");
    const timeout = window.setTimeout(() => setMotionState("open"), 0);
    return () => window.clearTimeout(timeout);
  }
  setActiveKind(null);
  setMotionState((current) => (current === "hidden" ? "hidden" : "closing"));
  const timeout = window.setTimeout(() => setMotionState("hidden"), 260);
  return () => window.clearTimeout(timeout);
}, [open]);

useEffect(() => {
  if (!open) return;
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") openCreateMenuAt(null);
  };
  window.addEventListener("keydown", closeOnEscape, true);
  return () => window.removeEventListener("keydown", closeOnEscape, true);
}, [open, openCreateMenuAt]);
```

Return `motionState`, `activeKind`, `onActiveKindChange: setActiveKind`. Strip hooks from the view; keep the portal markup.

The container already calls exactly one hook and one `*-view` — no container change except spreading new props (already `{...view}`).

- [ ] **Step 5: Re-run conventions**

Run: `bun run check:conventions`

Expected: `check-conventions: ok` (or equivalent zero-violation success, exit 0).

- [ ] **Step 6: Types + format**

Run: `bun run check-types && bun run check`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add \
  apps/web/src/features/task-management/task-list/agency-task-group-row-view.tsx \
  apps/web/src/features/task-management/task-list/agency-task-group-row.tsx \
  apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts \
  apps/web/src/features/workspace-agent/workspace-agent-view.tsx \
  apps/web/src/features/workspace-knowledge/hooks/use-canvas-knowledge-create-menu.ts \
  apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx
git commit -m "$(cat <<'EOF'
fix: lift golden-file orchestration out of three views

Empty allowlists stay empty; CI check was failing on hook/query reachability.
EOF
)"
```

---

### Task 2: Remove leftover unmounted product chrome

**Files:**
- Modify: `apps/web/src/components/assistant-ui/thread.tsx`
- Delete: `apps/web/src/features/billing/money-payout-run.ts`
- Delete: `apps/web/src/features/billing/money-payout-run.test.ts`
- Delete: `apps/web/src/features/billing/money-payout-run-view.tsx`
- Delete: `apps/web/src/features/billing/build-money-payout-run-view-model.ts`
- Delete: `apps/web/src/features/billing/build-money-payout-run-view-model.test.ts`
- Delete: `apps/web/src/features/billing/agency-money-surface.tsx`
- Delete: `apps/web/src/features/auth/protected-route.tsx`
- Delete: `apps/web/src/providers/query-provider.tsx`
- Delete: `apps/web/src/features/dashboard/agency-dashboard-command-bar.tsx` (after retargeting its test)
- Modify: `apps/web/src/features/dashboard/agency-dashboard-command-bar.test.ts`
- Keep: `packages/api/src/routers/agency-ops/billing/payout-service.ts` (`getRun` / `list` / `summary` / `syncFormulaLines` — 50 production runs back Bills + formula lines)
- Keep: `agency_ops_payout_run` / `_section` / `_line` and `agency_ops_salary_member_settlement` tables

**Interfaces:**
- Consumes: Money UI already uses `features/money/agency-money-surface.tsx`; authenticated shell uses `routes/_authenticated.tsx`
- Produces: no payout-run mount; no `ThreadFollowupSuggestions` in the live Thread

- [ ] **Step 1: Confirm payout-run has no product importers**

Run:

```bash
rg -n "money-payout-run|MoneyPayoutRunView|buildMoneyPayoutRunViewModel|#money-period-run" apps/web packages --glob '!**/node_modules/**'
```

Expected: hits only in the files listed for delete (and maybe comments in `.impeccable/` / docs). No `features/money/` imports.

- [ ] **Step 2: Unmount follow-up suggestions**

In `apps/web/src/components/assistant-ui/thread.tsx`, remove:

```tsx
import { ThreadFollowupSuggestions } from "@/components/assistant-ui/follow-up-suggestions";
```

and the JSX:

```tsx
<ThreadFollowupSuggestions />
```

Leave `follow-up-suggestions.tsx` on disk until Task 6 knip sweep (unmount first so knip can see it).

- [ ] **Step 3: Retarget the dashboard command-bar test, then delete the deprecated re-export**

`agency-dashboard-command-bar.tsx` is:

```ts
export {
  AgencyTimeRangeCommandBar as AgencyDashboardCommandBar,
  rangePresetLabel,
  rangePresets,
} from "@/features/shared/agency-time-range-command-bar";
```

Change `agency-dashboard-command-bar.test.ts` to import `rangePresetLabel` and `rangePresets` from `@/features/shared/agency-time-range-command-bar`. Then delete `agency-dashboard-command-bar.tsx`.

- [ ] **Step 4: Delete the dead files**

```bash
git rm \
  apps/web/src/features/billing/money-payout-run.ts \
  apps/web/src/features/billing/money-payout-run.test.ts \
  apps/web/src/features/billing/money-payout-run-view.tsx \
  apps/web/src/features/billing/build-money-payout-run-view-model.ts \
  apps/web/src/features/billing/build-money-payout-run-view-model.test.ts \
  apps/web/src/features/billing/agency-money-surface.tsx \
  apps/web/src/features/auth/protected-route.tsx \
  apps/web/src/providers/query-provider.tsx \
  apps/web/src/features/dashboard/agency-dashboard-command-bar.tsx
```

- [ ] **Step 5: Regenerate golden inventory**

Run: `node scripts/generate-golden-file-inventory.mjs && bun run check:golden`

Expected: PASS (1469 minus deleted rows, plus any new rows from Task 1).

- [ ] **Step 6: Tests + check**

Run:

```bash
bun test apps/web/src/features/dashboard/agency-dashboard-command-bar.test.ts
bun run check
bun run check-types
```

Expected: PASS. Follow-up suggestions still exist as a file; Thread no longer mounts them.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: remove unmounted payout-run UI and leftover SSR shims

Keep payouts API names; drop Thread follow-up footer from the live composer.
EOF
)"
```

---

### Task 3: One query-snapshot helper for both mutation stores

**Files:**
- Create: `apps/web/src/features/shared/query-snapshots.ts`
- Create: `apps/web/src/features/shared/query-snapshots.test.ts`
- Modify: `apps/web/src/features/shared/stores/agency-ops.ts` (local `QuerySnapshot` / `snapshotQueries` / `restoreQuerySnapshots` around lines 91 and 466–475)
- Modify: `apps/web/src/features/time-tracking/stores/agency-time-tracking.ts` (local copies around lines 144 and 1646–1657)

**Interfaces:**
- Consumes: `getQueryClient()` from `@/lib/query-client`
- Produces:

```ts
import type { QueryKey } from "@tanstack/react-query";

export type QuerySnapshot = {
  queryKey: QueryKey;
  data: unknown;
};

export function snapshotQueries(
  queries: Iterable<{ queryKey: QueryKey }>,
): QuerySnapshot[];

export function restoreQuerySnapshots(snapshots: QuerySnapshot[]): void;
```

Do not put this in `agency-query-cache.ts` (that file owns task-list cache patches, not mutation rollback). Do not build `runOptimisticMutation` in this task.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import type { QueryKey } from "@tanstack/react-query";

import { restoreQuerySnapshots, snapshotQueries } from "@/features/shared/query-snapshots";

const KEY: QueryKey = ["hygiene-snapshot"];

describe("query-snapshots", () => {
  test("restore puts back the captured value", async () => {
    const { getQueryClient } = await import("@/lib/query-client");
    const client = getQueryClient();
    client.setQueryData(KEY, { n: 1 });
    const snaps = snapshotQueries([{ queryKey: KEY }]);
    client.setQueryData(KEY, { n: 2 });
    restoreQuerySnapshots(snaps);
    expect(client.getQueryData(KEY)).toEqual({ n: 1 });
  });
});
```

If `getQueryClient` needs a browser/document, skip this file and instead export the two functions as pure wrappers that take `getQueryData`/`setQueryData` injectors — **do not do that**. Match existing store code: they already call `getQueryClient()` in unit-testable Node. If the test cannot import the query client, assert the functions exist and that a tiny in-memory fake is unnecessary; then test via a store-level test that already constructs the client. Prefer the test above first.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/features/shared/query-snapshots.test.ts`

Expected: FAIL with `Cannot find module` / `query-snapshots`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { QueryKey } from "@tanstack/react-query";

import { getQueryClient } from "@/lib/query-client";

export type QuerySnapshot = {
  queryKey: QueryKey;
  data: unknown;
};

export function snapshotQueries(
  queries: Iterable<{ queryKey: QueryKey }>,
): QuerySnapshot[] {
  return [...queries].map((query) => ({
    queryKey: query.queryKey,
    data: getQueryClient().getQueryData(query.queryKey),
  }));
}

export function restoreQuerySnapshots(snapshots: QuerySnapshot[]) {
  snapshots.forEach((snapshot) => {
    getQueryClient().setQueryData(snapshot.queryKey, snapshot.data);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/features/shared/query-snapshots.test.ts`

Expected: PASS.

- [ ] **Step 5: Replace both store-local copies**

In `agency-ops.ts` and `agency-time-tracking.ts`:

1. Import `snapshotQueries`, `restoreQuerySnapshots`, and `QuerySnapshot` from `@/features/shared/query-snapshots`.
2. Delete the local `type QuerySnapshot` and the two local functions.
3. Leave `cancelQueries` in the time-tracking store (only one copy; not worth a third export yet).

- [ ] **Step 6: Types + check + inventory**

```bash
bun run check-types
bun run check
node scripts/generate-golden-file-inventory.mjs
bun run check:golden
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add \
  apps/web/src/features/shared/query-snapshots.ts \
  apps/web/src/features/shared/query-snapshots.test.ts \
  apps/web/src/features/shared/stores/agency-ops.ts \
  apps/web/src/features/time-tracking/stores/agency-time-tracking.ts \
  docs/golden-file-source-inventory.md
git commit -m "$(cat <<'EOF'
refactor: share query snapshot restore across agency mutation stores

Stop copying the same rollback helper in ops and time-tracking stores.
EOF
)"
```

---

### Task 4: Fold Reports flat-row waste into API `resolveEntryWaste`

**Files:**
- Modify: `apps/web/src/features/reports/agency-report-grouping.ts`
- Modify: `apps/web/src/features/reports/agency-report-grouping.test.ts`

**Interfaces:**
- Consumes: `resolveEntryWaste` from `@orch/api/routers/agency-ops/shared/waste-helpers` (web already imports `isWasteLabel` from this file)
- Produces: `isReportEntryWaste` still exported for tables/xlsx, but flat rows call `resolveEntryWaste`; `reportEntryWasteSources` stays Reports-only (Create Report show-waste column filters)

Do not move SQL `reportEntryIsWasteSql` or invent `@orch/agency-domain`. Do not change hour-metrics in this task.

Production (10 945 entries): 73 entry flags, 0 task flags, 198 live entries on waste-named tasks, 366 on waste-named projects. Folding through `resolveEntryWaste` is required so Reports matches Tracker/Money; keep `reportEntryWasteSources` for Create Report filters.

- [ ] **Step 1: Write the failing tests**

Append to `agency-report-grouping.test.ts`:

```ts
import { isReportEntryWaste } from "@/features/reports/agency-report-grouping";

describe("isReportEntryWaste", () => {
  test("treats entry flag, task flag, and waste labels as waste", () => {
    expect(isReportEntryWaste(makeEntry({ id: "e1", isWaste: true }))).toBe(true);
    expect(
      isReportEntryWaste(makeEntry({ id: "e2", taskIsWaste: true, taskTitle: "Research" })),
    ).toBe(true);
    expect(
      isReportEntryWaste(makeEntry({ id: "e3", taskTitle: "Daily waste", projectName: "Ship" })),
    ).toBe(true);
    expect(isReportEntryWaste(makeEntry({ id: "e4", taskTitle: "wasted effort" }))).toBe(false);
  });

  test("aggregated rows are waste only when every child is waste", () => {
    const mixed = {
      projectName: "Ship",
      taskTitle: "Research",
      taskIsWaste: false,
      entries: [
        makeEntry({ id: "a", isWaste: true }),
        makeEntry({ id: "b", isWaste: false, taskTitle: "Research" }),
      ],
    };
    const allWaste = {
      projectName: "Ship",
      taskTitle: "Research",
      taskIsWaste: false,
      entries: [
        makeEntry({ id: "a", isWaste: true }),
        makeEntry({ id: "b", taskTitle: "waste QA" }),
      ],
    };
    expect(isReportEntryWaste(mixed)).toBe(false);
    expect(isReportEntryWaste(allWaste)).toBe(true);
  });
});
```

Current `isReportEntryWaste` uses `isAnyWasteSource(reportEntryWasteSources(...))`, which is equivalent for flat rows. The tests encode the contract the fold must keep. If they already pass against the old helper, keep them — they become regression tests for the fold.

- [ ] **Step 2: Run tests**

Run: `bun test apps/web/src/features/reports/agency-report-grouping.test.ts`

Expected: PASS on current code (contract lock). If a test fails, fix the test to match `resolveEntryWaste` + aggregated `every` semantics in `waste-helpers.test.ts` (`wasted effort` is not waste).

- [ ] **Step 3: Fold the flat-row branch**

In `agency-report-grouping.ts` change the import to:

```ts
import { isWasteLabel, resolveEntryWaste } from "@orch/api/routers/agency-ops/shared/waste-helpers";
```

Replace `isReportEntryWaste`:

```ts
export function isReportEntryWaste(
  entry:
    | Pick<AgencyReportEntry, "projectName" | "taskTitle" | "taskIsWaste" | "isWaste">
    | Pick<AggregatedReportRow, "projectName" | "taskTitle" | "taskIsWaste" | "entries">,
): boolean {
  if ("entries" in entry) {
    if (entry.entries.length === 0) {
      return resolveEntryWaste({
        projectName: entry.projectName,
        taskTitle: entry.taskTitle,
        taskIsWaste: entry.taskIsWaste,
        isWaste: false,
      });
    }
    return entry.entries.every((item) => resolveEntryWaste(item));
  }
  return resolveEntryWaste(entry);
}
```

Keep `reportEntryWasteSources` / `isReportEntryWasteVisible` using `isWasteLabel` (presentation filters, not a second classifier).

- [ ] **Step 4: Re-run tests**

Run: `bun test apps/web/src/features/reports/agency-report-grouping.test.ts packages/api/src/routers/agency-ops/shared/waste-helpers.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/features/reports/agency-report-grouping.ts \
  apps/web/src/features/reports/agency-report-grouping.test.ts
git commit -m "$(cat <<'EOF'
refactor: classify report waste through resolveEntryWaste

Keep Reports show-waste source filters local; stop forking flag+label rules.
EOF
)"
```

---

### Task 5: Legacy `manage=rates` / `manage=tags` redirects

**Files:**
- Modify: `apps/web/src/features/shared/agency-legacy-redirects.ts` (`resolveManagementPane` around lines 90–99)
- Modify: `apps/web/src/features/shared/agency-hrefs.test.ts` (`AGENCY_LEGACY_REDIRECT_CASES`)

**Interfaces:**
- Consumes: `agencyManagementHref("tenure")` → `/agency/management/people`; money pane → `/agency/management/money`
- Produces: `manage=rates` → People (production has 1 member-rate row; client/task rates inherit elsewhere); `manage=tags` → Tracker `/agency` (0 tag rows in production; tags are not a Management pane and the table stays)

- [ ] **Step 1: Write the failing redirect cases**

In `AGENCY_LEGACY_REDIRECT_CASES` add:

```ts
{ from: "/agency?section=management&manage=rates", to: "/agency/management/people" },
{ from: "/agency?section=management&manage=tags", to: "/agency" },
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/features/shared/agency-hrefs.test.ts`

Expected: FAIL on the new cases (`to` still `/agency/management/resourcing` via the default branch).

- [ ] **Step 3: Implement**

```ts
function resolveManagementPane(
  section: string | null,
  manage: string | null,
): AgencyManagementPaneId {
  if (manage === "invoices" || manage === "billing") return "money";
  if (manage === "rates") return "tenure";
  if (isAgencyManagementPaneId(manage)) return manage;
  if (section === "billing") return "money";
  if (section === "resourcing" || section === "settings") return "resourcing";
  return "resourcing";
}
```

Handle `tags` **before** calling `resolveManagementPane` inside `resolveLegacyTargetPath`, because tags are not a management pane:

```ts
if (manage === "tags") {
  return "/agency";
}
```

Place that next to the other `manage` / `section` branches (same function as existing `manage=invoices` handling).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/features/shared/agency-hrefs.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/features/shared/agency-legacy-redirects.ts \
  apps/web/src/features/shared/agency-hrefs.test.ts
git commit -m "$(cat <<'EOF'
fix: redirect leftover Management rates and tags query routes

Rates land on People; tags are Tracker, not a Management pane.
EOF
)"
```

---

### Task 6: Knip unused files and dependencies

**Files:**
- Modify: `knip.json` (`apps/web.entry` add `scripts/railway-ssr-server.mjs`)
- Delete: knip-reported unused product files after Tasks 1–5 (do not guess; use the command below)
- Modify: `apps/web/package.json` unused deps after files are gone
- Modify: `apps/web/src/features/workspace-agent/assistant-ui-catalog.ts` — drop catalog entries whose files were deleted
- Modify: `docs/golden-file-source-inventory.md` via generator

**Interfaces:**
- Consumes: knip as the unused oracle
- Produces: `bun run check:unused` exit 0, or a documented knip `ignore` **only** for proven false positives (railway SSR copy source belongs in `entry`, not `ignore`)

Keep list (do not delete even if knip nags before the knip.json fix):

- `apps/web/scripts/railway-ssr-server.mjs` — copied by `write-railway-server.mjs`
- Live assistant-ui: `thread`, `attachment`, `file`, `image`, `markdown-text`, `reasoning`, `tool-fallback`, `tool-group`, `tooltip-icon-button`, `model-selector`
- Live elements actually imported by `workspace-agent` (composer, empty-state, error-state, artifact-card, surfaces, range, thread-list, etc.)
- Live `features/billing/` helpers imported by `features/money/`
- `scripts/generate-golden-file-inventory.mjs`

High-confidence deletes once knip lists them (confirm with the command; skip any that suddenly have importers):

- Compat re-exports: `apps/web/src/features/member-profile/member-profile-date-picker.tsx`, `member-profile-heat-map.tsx`, `member-profile-leave-range-picker.tsx`
- Unused marketing bits: `apps/web/src/components/marketing/bits/AnimatedContent.tsx`, `Aurora.tsx`, `BlurText.tsx`, `Magnet.tsx`, `SpotlightCard.tsx`
- `apps/web/src/components/icons/github.tsx`
- `apps/web/src/features/workspace-agent/tool-trace-view.tsx` and `apps/web/src/components/ai-elements/{code-block,prompt-input,tool}.tsx` if still unused
- Unwired `apps/web/src/components/assistant-ui/*` and `apps/web/src/components/elements/*` that knip reports after the Thread unmount
- `apps/web/src/features/resourcing/tenure/agency-settings-tenure-member-detail.tsx` only if knip still reports it unused (People Block* form). If it is unused, delete it; do not migrate Block* on a dead file.

- [ ] **Step 1: Fix knip entry for the Railway SSR server**

In `knip.json` under `apps/web.entry`, add `"scripts/railway-ssr-server.mjs"` next to `write-railway-server.mjs`.

- [ ] **Step 2: Capture unused files**

Run: `bunx knip --include files --no-progress`

Save the list. Delete only files under `apps/web/src` and confirmed unused `apps/server/src/operations/*` one-offs **after** checking they are not referenced from `package.json` scripts.

Do not delete `apps/server/src/operations/migrate-agency-money-amounts.ts` or `backfill-workspace-knowledge.ts` unless `package.json` / turbo scripts do not name them **and** you add a one-line note in the commit that they were one-off and unused.

- [ ] **Step 3: Delete unused files in one git rm**

```bash
git rm <paths from step 2>
```

- [ ] **Step 4: Drop unused npm deps**

Run: `bunx knip --include dependencies,devDependencies --no-progress`

Remove unused packages from `apps/web/package.json` only when no remaining source import remains. Then `bun install`.

Likely candidates after assistant-ui trim (confirm, do not blindly copy): `@assistant-ui/react-generative-ui`, `@assistant-ui/react-mcp`, `@assistant-ui/react-syntax-highlighter`, `react-syntax-highlighter`, `@types/react-syntax-highlighter`, `beautiful-mermaid`, `react-shiki` — **only if knip still lists them**.

Do **not** remove `gsap` if landing or canvas still imports it. Do **not** remove fonts already in `knip.json` `ignoreDependencies`.

- [ ] **Step 5: Trim `ASSISTANT_UI_WEBSITE_ITEMS`**

After deletes, run existing catalog tests:

```bash
bun test apps/web/src/features/workspace-agent
```

If tests assert files exist for every catalog id, shrink `ASSISTANT_UI_WEBSITE_ITEMS` to ids whose files remain. Do not keep catalog rows for deleted demo chrome.

- [ ] **Step 6: Inventory + unused + types + check**

```bash
node scripts/generate-golden-file-inventory.mjs
bun run check:golden
bun run check:unused
bun run check
bun run check-types
```

Expected: all PASS. If `check:unused` still fails on unused **exports**, either delete the export or keep it if it is a public feature barrel. Do not ignore whole files to hide exports.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: delete unused web files and assistant-ui demo chrome

Knip is the unused oracle; Railway SSR server is a real entry, not an ignore.
EOF
)"
```

---

### Task 7: Docs, broken Bruno scripts, and seal the check gate

**Files:**
- Modify: `package.json` (`test:api:bruno*` scripts; `check` script)
- Modify: `.cursor/rules/testing.mdc` Bruno section
- Modify: `CONTRIBUTING.md` project structure + PR checklist
- Modify: `docs/golden-file-refactor-progress.md` — replace body with a short “superseded” pointer to this plan and `docs/golden-file-pattern.md` (do not leave July “reopened” badges as if current)
- Keep: `docs/golden-file-pattern.md` as the live layer spec (update any stale path that still names `apps/web/src/lib/queries/agency-optimistic.ts` → `apps/web/src/features/shared/agency-optimistic.ts` if that string is still present)
- Modify: `knip.json` only if Task 6 left a documented false positive

**Interfaces:**
- Consumes: Tasks 1–6 green `check:conventions` and `check:unused`
- Produces: `bun run check` runs oxlint, conventions, unused, golden, oxfmt

- [ ] **Step 1: Confirm Bruno targets are missing**

```bash
ls tests/bruno/orch-api scripts/run-bruno-api-tests.sh
```

Expected: both missing.

- [ ] **Step 2: Remove Bruno npm scripts**

Delete from `package.json`:

```json
"test:api:bruno": "bunx --yes @usebruno/cli run tests/bruno/orch-api -r --env Local --tests-only",
"test:api:bruno:auto": "bash scripts/run-bruno-api-tests.sh",
"test:api:bruno:ci": "bash scripts/run-bruno-api-tests.sh --ci",
```

In `.cursor/rules/testing.mdc`, replace the Bruno section with:

```markdown
## API integration

Bruno collections were removed. Do not add `test:api:bruno*` scripts until a new collection lands under `tests/bruno/`.
```

- [ ] **Step 3: Update CONTRIBUTING layout and checklist**

Replace the stale tree (`pages/`, top-level `stores/`) with:

```
apps/web/src/features/<domain>/   # golden-file features
apps/web/src/ui/                  # shadcn primitives
apps/web/src/routes/              # TanStack Start routes
packages/api/src/routers/         # oRPC routers + services
```

PR checklist becomes:

```markdown
- [ ] `bun run check` passes (oxlint, conventions, unused, golden, oxfmt)
- [ ] `bun run check-types` passes
- [ ] `bun run check:conventions` is implied by `check` (empty golden allowlists)
```

- [ ] **Step 4: Point the golden-file progress log at current truth**

Replace the contents of `docs/golden-file-refactor-progress.md` with a short notice:

```markdown
# Golden File Pattern — Progress

This log is frozen. Live rules: [`golden-file-pattern.md`](./golden-file-pattern.md).
Hygiene and leftover cleanup: [`superpowers/plans/2026-09-14-repo-hygiene-cleanup.md`](./superpowers/plans/2026-09-14-repo-hygiene-cleanup.md).

Inventory is generated (`docs/golden-file-source-inventory.md`) and checked by `bun run check:golden`.
Allowlists in `scripts/check-conventions.mjs` are empty.
```

If `docs/golden-file-pattern.md` still cites `apps/web/src/lib/queries/agency-optimistic.ts`, retarget to `apps/web/src/features/shared/agency-optimistic.ts`.

- [ ] **Step 5: Seal `bun run check`**

Change `package.json`:

```json
"check": "oxlint && node scripts/check-conventions.mjs && knip --include dependencies,devDependencies,exports,files,types && node scripts/check-golden-file-inventory.mjs && oxfmt --write"
```

Keep `check:unused` and `check:golden` as aliases for debugging.

CI already runs `bun run check` (`.github/workflows/ci.yml`). Do not add unused/golden to CI until this step, or `dev` stays red.

- [ ] **Step 6: Run the sealed gate**

```bash
bun run check
bun run check-types
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json .cursor/rules/testing.mdc CONTRIBUTING.md \
  docs/golden-file-refactor-progress.md docs/golden-file-pattern.md
git commit -m "$(cat <<'EOF'
chore: fold unused and golden inventory into bun run check

Drop broken Bruno scripts and stop treating the July golden-file log as current.
EOF
)"
```

---

## Self-review

**Spec coverage**

| Requirement | Task |
|-------------|------|
| Conventions green, empty allowlists | Task 1 |
| Removed leftover UI (payout-run, follow-ups, SSR shims) | Task 2 |
| Duplicated snapshot/restore | Task 3 |
| Duplicated waste classification | Task 4 |
| Deprecated Management query routes | Task 5 |
| Unused files/deps / demo chrome | Task 6 |
| Maintain via one check gate + honest docs | Task 7 |

**Placeholder scan:** no TBD/TODO implement-later steps; delete lists that depend on knip output say “confirm with knip” instead of inventing paths.

**Type consistency:** `QuerySnapshot`, `snapshotQueries`, `restoreQuerySnapshots`, `resolveEntryWaste`, `renderRateControl`, `dockLandPulse`, `MenuMotionState` names match across tasks.

**Explicitly not in this plan:** new domain package, store merge, date-key util, Money folder merge, schema renames.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-14-repo-hygiene-cleanup.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch with checkpoints

Which approach?
