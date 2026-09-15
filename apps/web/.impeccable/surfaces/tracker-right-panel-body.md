---
version: 2
slug: "tracker-right-panel-body"
primary_target: "apps/web/src/features/task-management/tracker-right-panel/agency-tracker-right-panel-view.tsx"
related_targets:
  [
    "apps/web/src/features/task-management/containers/agency-tracker-right-panel-container.tsx",
    "apps/web/src/features/task-management/hooks/use-agency-tracker-right-panel.ts",
    "apps/web/src/features/task-management/stores/agency-tracker-right-panel.ts",
    "apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-surface-body.tsx",
    "apps/web/src/features/task-management/break-timer/agency-break-timer-surface-body-view.tsx",
    "apps/web/src/features/task-management/tracker-right-panel/agency-agent-panel-surface-body-view.tsx",
    "apps/web/src/features/task-management/tracker-right-panel/agency-tracker-right-panel-surface-menu-view.tsx",
    "apps/web/src/features/task-management/work-surface/agency-work-surface-layout-view.tsx",
  ]
---

# Tracker right panel (T3 topology)

## Scope & mode

Operate — Tracker-only (`/agency`) tabbed right work panel. Not a new visual world; inherits Agency / Orch product system.

## Audience & job

Agency operators tracking time who want quick surfaces beside the log without permanently stealing width. Panel closed by default on first visit; restore last open surfaces afterward.

## Direction (locked)

- Topology: T3 Code panel grammar — closeable surface tabs, add (+) beside the last tab, collapse to slim dock, pending tick, tab context menu (close / close others / close to right).
- Surfaces v1: **My Tasks** (singleton), **Break** (multiple tabs; 10/15/30/60 + custom countdown), **Agent** (singleton placeholder).
- Empty open: `isOpen` with zero tabs shows **Open a surface** menu (same as **+** dropdown). Closing the last tab stays open on the picker; collapse is explicit.
- Layout: collapsed slim rail or compact inline dock at `lg+`; Sheet below `lg`. No full-screen expanded overlay.
- Collapsed rail: slim icon-only dock — expand control plus one icon per open surface kind (My Tasks / Break / Agent). Count badges for open tasks / multiple break tabs; live pulse when a break is running or My Tasks is pending. No vertical “Panel” label. Clicking a kind icon reopens that surface.
- Chrome: tab strip is identity (no duplicate page title). Break tab title shows `Break · MM:SS` while running.

## Memorable moment

Open panel → pick a surface from the menu → Break countdown with animated digits and preset pills, or My Tasks with pending tick while adding/running.

## Constraints

Clockify-adjacent task/play patterns; shadcn tokens; golden-file layers; `MotionConfig reducedMotion="user"`; break timer state in panel localStorage only (v2 persist key); no height tween on virtualized log; keyboard shortcuts **T** / **B** / **A** when panel focused.
