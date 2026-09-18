# Agency Tracker Week Stack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the selected Open Design **Week stack** direction (Harvest-like day cards, one surface per day) onto Agency Tracker without removing any Clockify action, without changing idle Start / task-required Stop, and without touching expanded My Tasks internals.

**Architecture:** Operate-mode restyle inside existing DESIGN.md tokens (dark, quiet instrument, no liquid glass). Tracker chrome must paint independently of the 647-project / 904-task catalog. The log becomes week sections with sticky slimming heads plus one card per day. Use existing `motion` for week-head layout morph — do not add GSAP. Golden-file: views stay presentational; new helpers own chrome-ready, empty-description, and pinned week-head class logic.

**Visual source of truth:** Open Design project `agency-tracker-directions-v2-34cc`, file `tracker-directions.html`, direction `d0` / `renderD0()`. Preview: `http://127.0.0.1:34621/api/projects/agency-tracker-directions-v2-34cc/raw/tracker-directions.html`. Port geometry, hierarchy, hover-reveal, and empty-description treatment — not the prototype’s fake data or picker chrome.

**Tech Stack:** React 19, TanStack Query, `motion`, shadcn tokens, Bun test (logic only — no Playwright / no component render tests).

---

## Global constraints

- Keep every current Tracker / entry / bulk / kebab / billable / links / tags / duration / play / copy-day / load-more action. Placement may change; removal is out of scope.
- Idle Start stays: Start enabled without a task; Stop blocked until a task is chosen (`canStartAgencyTimer` / `AGENCY_TIMER_STOP_TASK_REQUIRED`). Chooser `required={!activeTimer}` stays.
- Durations stay second-precise (`hh:mm:ss`) end-to-end.
- Do not change expanded My Tasks internals. Collapsed rail polish only (align to tracker top, expand + open-count badge).
- No liquid glass. Base theme tokens only. Tracker uses default card borders.
- Views do not call oRPC, query hooks, stores, or auth.
- No Playwright / no component tests. Bun unit tests for helpers only.
- After each task: `bun run check` in `apps/web` scope when possible; before finishing the branch: `bun run check`, `bun run check-types`, `bun run check:conventions`. Run `bun run check:golden` only after adding or relocating in-scope source files.

---

## File map

| File | Role |
| --- | --- |
| `apps/web/src/features/time-tracking/tracker-chrome-ready.ts` | **New.** When tracker chrome may paint vs skeleton-only. |
| `apps/web/src/features/time-tracking/tracker-chrome-ready.test.ts` | **New.** Chrome must not wait on project/task catalog. |
| `apps/web/src/features/time-tracking/hooks/use-agency-time-tracker.ts` | Stop gating `isTrackerLoading` on full catalog. |
| `apps/web/src/features/time-tracking/agency-time-tracker-loading-view.tsx` | Keep Start/Add chrome; shimmer only inner slots. |
| `apps/web/src/features/time-tracking/agency-time-tracker-view.tsx` | 56px card bar; truncate task chooser; no wrap. |
| `apps/web/src/features/shared/agency-ui.ts` | Tracker / week / day / row / hover-reveal classes. |
| `apps/web/src/features/time-tracking/week-head-state.ts` | **New.** Pinned vs rest week-head class map. |
| `apps/web/src/features/time-tracking/week-head-state.test.ts` | **New.** Slim vs rest class contract. |
| `apps/web/src/features/time-tracking/hooks/use-sticky-week-head.ts` | **New.** IntersectionObserver → pinned week keys. |
| `apps/web/src/features/time-tracking/entries/agency-time-entry-week-group-view.tsx` | Sticky week head + slim morph. |
| `apps/web/src/features/time-tracking/hooks/use-agency-time-entries-log.ts` | Virtualizer heights for taller week/day chrome. |
| `apps/web/src/features/time-tracking/entries/agency-time-entry-day-group-view.tsx` | Day card surface; hover copy; chevron. |
| `apps/web/src/features/time-tracking/entry-description-display.ts` | **New.** Omit empty description; “Add note” hover. |
| `apps/web/src/features/time-tracking/entry-description-display.test.ts` | **New.** Empty vs present description. |
| `apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx` | Hover-only clocks/play/links/kebab; ghost note. |
| `apps/web/src/features/time-tracking/entries/agency-time-entries-log-view.tsx` | Skeleton rows; keep Start sibling visible. |
| `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-view.tsx` | Collapsed rail top-align only. |
| `apps/web/src/index.css` | Hover-reveal / reduced-motion only if token classes are insufficient. |
| `docs/golden-file-source-inventory.md` | Regenerated after new files. |

Do **not** change `ensureAgencyWorkBootQueries` to block first paint. Prefetch may stay in the background; Tracker chrome must not wait for it.

---

## Task 1: Unblock tracker chrome (TDD)

**Files:**
- Create: `apps/web/src/features/time-tracking/tracker-chrome-ready.ts`
- Create: `apps/web/src/features/time-tracking/tracker-chrome-ready.test.ts`
- Modify: `apps/web/src/features/time-tracking/hooks/use-agency-time-tracker.ts`
- Modify: `apps/web/src/features/time-tracking/agency-time-tracker-loading-view.tsx`
- Modify: `apps/web/src/features/time-tracking/agency-time-tracker-view.tsx` (loading branch only if the container still swaps the whole bar)

Today `isTrackerLoading` is `projectsQuery.isPending || (tasksQuery.isPending && tasks.length === 0)`. That hides Start until 647 projects + the first 100-task catalog page resolve. Week stack requires Start visible immediately; chooser hydrates in place.

### Step 1: Write the failing test

```ts
import { expect, test } from "bun:test";

import { shouldBlockTrackerChrome } from "./tracker-chrome-ready";

test("does not block chrome while projects and tasks are pending", () => {
  expect(
    shouldBlockTrackerChrome({
      hasTeam: true,
      projectsPending: true,
      tasksPending: true,
      taskCount: 0,
    }),
  ).toBe(false);
});

test("blocks chrome without a team", () => {
  expect(
    shouldBlockTrackerChrome({
      hasTeam: false,
      projectsPending: false,
      tasksPending: false,
      taskCount: 0,
    }),
  ).toBe(true);
});

test("does not block chrome after catalog hydrates", () => {
  expect(
    shouldBlockTrackerChrome({
      hasTeam: true,
      projectsPending: false,
      tasksPending: false,
      taskCount: 40,
    }),
  ).toBe(false);
});
```

### Step 2: Run test to verify it fails

Run: `bun test apps/web/src/features/time-tracking/tracker-chrome-ready.test.ts`

Expected: FAIL because the module does not exist.

### Step 3: Write the helper

```ts
export function shouldBlockTrackerChrome(input: {
  hasTeam: boolean;
  projectsPending: boolean;
  tasksPending: boolean;
  taskCount: number;
}): boolean {
  void input.projectsPending;
  void input.tasksPending;
  void input.taskCount;
  return !input.hasTeam;
}
```

Keep the unused catalog flags in the signature so the hook cannot quietly re-introduce them without updating the test.

### Step 4: Wire the hook

In `use-agency-time-tracker.ts`, replace:

```ts
isTrackerLoading: projectsQuery.isPending || (tasksQuery.isPending && tasks.length === 0),
```

with:

```ts
isTrackerLoading: shouldBlockTrackerChrome({
  hasTeam: Boolean(teamId),
  projectsPending: projectsQuery.isPending,
  tasksPending: tasksQuery.isPending,
  taskCount: tasks.length,
}),
```

Do **not** change `startButtonDisabled`. Idle Start without a task stays.

### Step 5: Loading view keeps Start chrome

Replace whole-bar shimmer with a 56px card that still shows a disabled-looking Start (and Add) on the right. Shimmer only the description + task slots. `aria-busy="true"` stays on the card. Do not hide the timer CTA.

If the container currently swaps the entire tracker for `AgencyTimeTrackerLoadingView`, keep that swap only when `shouldBlockTrackerChrome` is true (no team). Catalog pending must render the real tracker view so Start is live.

### Step 6: Re-run tests

Run: `bun test apps/web/src/features/time-tracking/tracker-chrome-ready.test.ts`

Expected: PASS.

### Step 7: Commit

```bash
git add apps/web/src/features/time-tracking/tracker-chrome-ready.ts \
  apps/web/src/features/time-tracking/tracker-chrome-ready.test.ts \
  apps/web/src/features/time-tracking/hooks/use-agency-time-tracker.ts \
  apps/web/src/features/time-tracking/agency-time-tracker-loading-view.tsx
git commit -m "$(cat <<'EOF'
fix(tracker): paint Start without waiting on the task catalog

EOF
)"
```

---

## Task 2: Tracker bar Week-stack geometry

**Files:**
- Modify: `apps/web/src/features/shared/agency-ui.ts`
- Modify: `apps/web/src/features/time-tracking/agency-time-tracker-view.tsx`

Prototype contract (`.d0 .tr`): one 56px card, description flexes, task chooser truncates (`max-width: 220px` at rest, grow when open), clocks / date / elapsed stay on one row, START/STOP is the only always-loud CTA. No wrap. Distinct from the log (tracker is the instrument; log is day cards).

### Step 1: Classes

Update `agencyTimeTrackerCardClass` from `min-h-[52px]` to `min-h-14` (56px) and keep `overflow-visible` so popovers work.

Add:

```ts
export const agencyTimeTrackerTaskSlotClass =
  "min-w-0 max-w-[220px] shrink truncate sm:max-w-[260px]";
```

Keep manual-add clocks, date trigger, links, kebab, billable-in-menu. Do not drop controls; they may sit in the existing overflow / hover treatment already used on the bar.

### Step 2: View

In `agency-time-tracker-view.tsx`:

- Apply `agencyTimeTrackerTaskSlotClass` to the task chooser wrapper. Do not let the chooser wrap the bar onto two rows at ~790px.
- Description stays the flexing field.
- START / STOP / ADD stay on the right, same idle/running/manual logic.
- Whole-bar loading shimmer is gone after Task 1; running state still uses the existing elapsed popover.

### Step 3: Commit

```bash
git add apps/web/src/features/shared/agency-ui.ts \
  apps/web/src/features/time-tracking/agency-time-tracker-view.tsx
git commit -m "$(cat <<'EOF'
feat(tracker): restyle the timer bar to the Week stack 56px card

EOF
)"
```

---

## Task 3: Sticky week heads that slim when pinned (TDD)

**Files:**
- Create: `apps/web/src/features/time-tracking/week-head-state.ts`
- Create: `apps/web/src/features/time-tracking/week-head-state.test.ts`
- Create: `apps/web/src/features/time-tracking/hooks/use-sticky-week-head.ts`
- Modify: `apps/web/src/features/shared/agency-ui.ts`
- Modify: `apps/web/src/features/time-tracking/entries/agency-time-entry-week-group-view.tsx`
- Modify: `apps/web/src/features/time-tracking/hooks/use-agency-time-entries-log.ts`
- Modify: `apps/web/src/features/time-tracking/entries/agency-time-entries-log-view.tsx` (pass pinned keys + scroll root)

Prototype: `.week-head` is sticky; when pinned it drops from ~62px rest to ~36px slim (smaller type, tighter padding). Use `motion` layout (`layout` / `layoutId` optional) with `motion-reduce:transition-none`. Do not add GSAP.

### Step 1: Failing test

```ts
import { expect, test } from "bun:test";

import { agencyTimeWeekHeadStateClass } from "./week-head-state";

test("rest week head is tall", () => {
  expect(agencyTimeWeekHeadStateClass(false)).toContain("min-h-[62px]");
});

test("pinned week head slims", () => {
  const pinned = agencyTimeWeekHeadStateClass(true);
  expect(pinned).toContain("min-h-9");
  expect(pinned).not.toContain("min-h-[62px]");
});
```

### Step 2: Run test — expect FAIL

Run: `bun test apps/web/src/features/time-tracking/week-head-state.test.ts`

### Step 3: Implement class map

```ts
import { cn } from "@/lib/utils";

export function agencyTimeWeekHeadStateClass(isPinned: boolean): string {
  return cn(
    "sticky top-0 z-10 flex items-center justify-between gap-3 bg-background/95 backdrop-blur-sm",
    isPinned
      ? "min-h-9 py-1 text-xs text-muted-foreground"
      : "min-h-[62px] py-2 text-sm text-highlighted",
  );
}
```

Replace `agencyTimeWeekGroupHeaderClass` usage with this helper so the rest/pinned contract lives in one place. Keep week total on the right.

### Step 4: Sticky observer hook

`useStickyWeekHead(scrollRoot: HTMLElement | null)` returns `Set<string>` of pinned week keys. Observe each `[data-week-head]` with `root: scrollRoot`, `threshold: [1]`, `rootMargin: '-1px 0px 0px 0px'`. Intersection `intersectionRatio < 1` while `boundingClientRect.top <= rootTop` means pinned.

The hook is presentational-adjacent but lives in `hooks/` so the week view stays prop-driven: `isPinned: boolean`.

Wire from the log container: pass `isPinned` per week into `AgencyTimeEntryWeekGroupView`.

### Step 5: Virtualizer heights

In `use-agency-time-entries-log.ts`:

```ts
const WEEK_HEADER_HEIGHT = 62;
const ESTIMATED_DAY_HEADER_HEIGHT = 52;
```

Pinned slim is visual only; estimate the rest height so first layout does not jump.

### Step 6: Motion

On the week head element, use `motion.div` with `layout` and respect `prefers-reduced-motion`. Grouping-head “dubbing” is this slim morph plus the existing week/day enter — not a second animation system.

### Step 7: Re-run tests — expect PASS

Run: `bun test apps/web/src/features/time-tracking/week-head-state.test.ts`

### Step 8: Commit

```bash
git add apps/web/src/features/time-tracking/week-head-state.ts \
  apps/web/src/features/time-tracking/week-head-state.test.ts \
  apps/web/src/features/time-tracking/hooks/use-sticky-week-head.ts \
  apps/web/src/features/shared/agency-ui.ts \
  apps/web/src/features/time-tracking/entries/agency-time-entry-week-group-view.tsx \
  apps/web/src/features/time-tracking/hooks/use-agency-time-entries-log.ts \
  apps/web/src/features/time-tracking/entries/agency-time-entries-log-view.tsx
git commit -m "$(cat <<'EOF'
feat(tracker): slim sticky week heads in the Week stack log

EOF
)"
```

---

## Task 4: Day cards (Harvest stack)

**Files:**
- Modify: `apps/web/src/features/shared/agency-ui.ts`
- Modify: `apps/web/src/features/time-tracking/entries/agency-time-entry-day-group-view.tsx`

Prototype: `.day-card` is one surface (`rounded-surface`, `border-border`, `bg-card`). Header is date + weekday + day total + copy-day (hover) + bulk. Rows sit inside the same card with hairline separators, not separate panels. Empty days are omitted (already true).

### Step 1: Classes

Replace `agencyTimeEntryDayGroupClass` (`bg-default` / `border-default`) with a card surface that matches the tracker token language:

```ts
export const agencyTimeEntryDayGroupClass =
  "@container/entries overflow-hidden rounded-surface border border-border bg-card";
```

Add:

```ts
export const agencyTimeEntryDayHeadClass =
  "flex min-h-[52px] items-center justify-between gap-3 border-b border-border/40 px-4";
```

Keep `agencyTimeWeekGroupBodyClass` gap so week gutters stay 20px.

### Step 2: View

- Day head: chevron, formatted date, weekday, total duration.
- Copy-day and bulk controls stay; copy-day may be hover/focus-visible only (`opacity-0 group-hover/day:opacity-100 focus-visible:opacity-100`, plus `motion-reduce:opacity-100` so keyboard users are not blocked).
- Bulk toolbar stays inside the card when selection is active.
- Do not invent a new empty-day card.

### Step 3: Commit

```bash
git add apps/web/src/features/shared/agency-ui.ts \
  apps/web/src/features/time-tracking/entries/agency-time-entry-day-group-view.tsx
git commit -m "$(cat <<'EOF'
feat(tracker): wrap each day in a Week stack card surface

EOF
)"
```

---

## Task 5: Entry rows — hover-reveal and omit empty description (TDD)

**Files:**
- Create: `apps/web/src/features/time-tracking/entry-description-display.ts`
- Create: `apps/web/src/features/time-tracking/entry-description-display.test.ts`
- Modify: `apps/web/src/features/shared/agency-ui.ts`
- Modify: `apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx`

Real volume: descriptions median 14 chars; empty description dominates. Prototype omits the empty field and shows a ghost “Add note” on hover. Clocks, play, date, links, kebab are hover/focus-visible only. Duration stays always visible. xN expand, waste chip, bulk, kebab billable all stay.

### Step 1: Failing tests

```ts
import { expect, test } from "bun:test";

import {
  entryDescriptionDisplayMode,
  type EntryDescriptionDisplayMode,
} from "./entry-description-display";

test("whitespace-only descriptions are omitted", () => {
  const mode: EntryDescriptionDisplayMode = entryDescriptionDisplayMode("   ");
  expect(mode).toBe("omitted");
});

test("present descriptions stay visible", () => {
  expect(entryDescriptionDisplayMode("paired homepage")).toBe("visible");
});
```

### Step 2: Run test — expect FAIL

Run: `bun test apps/web/src/features/time-tracking/entry-description-display.test.ts`

### Step 3: Helper

```ts
export type EntryDescriptionDisplayMode = "visible" | "omitted";

export function entryDescriptionDisplayMode(description: string): EntryDescriptionDisplayMode {
  return description.trim().length > 0 ? "visible" : "omitted";
}
```

### Step 4: Row view

- If `omitted`, do not render the empty description input at rest. Render a ghost “Add note” control (`opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100`) that focuses the description field. Editing a note keeps the field visible until blur-and-empty.
- Apply hover-reveal to start/end clocks, play, date, links, kebab. Duration, task, waste chip, xN stay at full opacity.
- Keyboard: any control that is hover-hidden must become visible on `:focus-visible` and in `prefers-reduced-motion` (full opacity).
- Do not add a dedicated clear-X on the task cell. Task change still opens the chooser.
- Links stay the hover/rail icon that opens the add-link dialog. Billable `$` stays in the kebab.

Add a shared class in `agency-ui.ts`:

```ts
export const agencyTimeEntryHoverRevealClass =
  "opacity-20 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 motion-reduce:opacity-100";
```

Prototype used 20% → 100%. Keep 20% so the rail is findable without a hunt, not fully invisible.

### Step 5: Re-run tests — expect PASS

Run: `bun test apps/web/src/features/time-tracking/entry-description-display.test.ts`

### Step 6: Commit

```bash
git add apps/web/src/features/time-tracking/entry-description-display.ts \
  apps/web/src/features/time-tracking/entry-description-display.test.ts \
  apps/web/src/features/shared/agency-ui.ts \
  apps/web/src/features/time-tracking/entries/agency-time-entry-row-view.tsx
git commit -m "$(cat <<'EOF'
feat(tracker): hover-reveal entry actions and omit empty notes

EOF
)"
```

---

## Task 6: Log skeletons and collapsed My Tasks alignment

**Files:**
- Modify: `apps/web/src/features/time-tracking/entries/agency-time-entries-log-view.tsx`
- Modify: `apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-view.tsx`

### Step 1: Log loading

When `isLoading` and the log is empty, render 3 day-card skeletons (header + 2 hairline rows each) inside the log panel. Do **not** replace the tracker bar. Do **not** use a whole-surface shimmer that covers Start.

Keep existing error + empty + load-more + bulk toolbar behavior.

### Step 2: Collapsed rail only

In `agency-my-tasks-rail-view.tsx` collapsed branch (~L318–363):

- Keep expand button + open-count badge.
- Align the stack to the tracker top (`justify-start`, no extra offset).
- Do not change expanded rail internals, My Tasks list, or thread.

### Step 3: Commit

```bash
git add apps/web/src/features/time-tracking/entries/agency-time-entries-log-view.tsx \
  apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-view.tsx
git commit -m "$(cat <<'EOF'
feat(tracker): skeleton the log separately from Start and align the collapsed rail

EOF
)"
```

---

## Task 7: Golden inventory, checks, and browser verification

### Step 1: Golden files

After the new helpers exist:

```bash
bun run check:golden
```

If it fails because new files are missing from `docs/golden-file-source-inventory.md`, run the repo’s generate script (same as other golden updates) and include the inventory in the commit. Expected domain: `time-tracking`. Tests classify as `test`. Helpers classify as feature domain modules (not `apps/web/src/lib/`).

### Step 2: Quality gates

```bash
bun run check
bun run check-types
bun run check:conventions
```

Expected: PASS.

### Step 3: Browser verification (required)

Exercise Tracker as a user, not a screenshot:

1. Cold load `/agency` Tracker with a real team. Start must be visible before the task chooser catalog finishes. Start without a task must work. Stop without a task must stay blocked.
2. ~790px with My Tasks expanded: tracker stays one 56px row; task truncates; Start/Add remain reachable.
3. ~1609px with My Tasks collapsed: rail top aligns with tracker; expand + badge work.
4. Scroll the log: week heads stick and slim; day cards are one surface per day; empty descriptions show “Add note” only on hover; clocks/play/links/kebab hover-reveal; duration always visible.
5. Expand an xN group, edit time, toggle waste, add a link, duplicate, delete, copy day, bulk select. All actions still exist.
6. Keyboard: Tab to hover-hidden controls — they must appear. Reduced motion: no slim morph / opacity fade required, controls visible.
7. Load more / page size still works on heavy users (thousands of entries).

If any Clockify action disappeared, restore it before finishing.

### Step 4: Commit inventory if generated

```bash
git add docs/golden-file-source-inventory.md
git commit -m "$(cat <<'EOF'
chore: record Week stack tracker helpers in the golden inventory

EOF
)"
```

Only if the inventory actually changed.

---

## Out of scope

- Expanded My Tasks list, create form, thread, or Orch-in-thread.
- Other Open Design directions (Today strip, Calendar blocks, Week matrix, Pulse, Ledger, Ribbon, Cluster).
- Changing idle Start / Stop-requires-task rules.
- Playwright tests, GSAP, liquid glass, new theme tokens.
- Server/API/schema changes.

---

## Self-review

1. **Spec coverage:** Chrome unblock, 56px bar, sticky slim week heads, day cards, hover-reveal, omit empty notes, log skeletons, collapsed rail, Clockify parity, idle Start — each has a task.
2. **Placeholder scan:** No TBD / TODO / “implement later”. Virtualizer heights and observer behavior are specified.
3. **Type consistency:** `shouldBlockTrackerChrome` input, `EntryDescriptionDisplayMode`, `isPinned` boolean — names match across tasks.
4. **4-step TDD:** Tasks 1, 3, 5 follow red/green. Tasks 2, 4, 6 are class/view ports of an approved visual; no new logic to unit-test beyond existing grouping.
5. **Bite-sized:** Each task is one concern and one commit.
}
