---
version: 1
slug: "tracker-right-panel-body"
primary_target: "apps/web/src/features/task-management/tracker-right-panel/agency-tracker-right-panel-view.tsx"
related_targets:
  [
    "apps/web/src/features/task-management/containers/agency-tracker-right-panel-container.tsx",
    "apps/web/src/features/task-management/hooks/use-agency-tracker-right-panel.ts",
    "apps/web/src/features/task-management/stores/agency-tracker-right-panel.ts",
    "apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-surface-body.tsx",
    "apps/web/src/features/task-management/work-surface/agency-work-surface-layout-view.tsx",
  ]
---

# Tracker right panel (T3 topology)

## Scope & mode

Operate — Tracker-only (`/agency`) tabbed right work panel. Not a new visual world; inherits Agency / Orch product system.

## Audience & job

Agency operators tracking time who want My Tasks beside the log without permanently stealing width. Panel closed by default on first visit; restore last open surfaces afterward.

## Direction (locked)

- Topology: T3 Code panel grammar — closeable surface tabs, add (+) beside the last tab, collapse to slim dock, pending tick, tab context menu (close / close others / close to right).
- v1 surfaces: **My Tasks only** (list + play-to-track, filters, composer). Thread stays cover-slide; Orch bottom dock unchanged.
- Layout: collapsed slim rail or compact inline dock at `lg+`; Sheet below `lg`. No full-screen expanded overlay.
- Chrome: tab strip is identity (no duplicate “My Tasks” page title). Composer status visible (not sr-only only).

## Memorable moment

Open panel → My Tasks tab with pending tick while adding or while the running timer’s task is on the list.

## Constraints

Clockify-adjacent task/play patterns; shadcn tokens; golden-file layers; `MotionConfig reducedMotion="user"`; no height tween on virtualized log.
