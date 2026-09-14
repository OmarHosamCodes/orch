---
version: 1
slug: "apps-web-src-features-app-shell"
primary_target: "apps/web/src/features/app-shell"
related_targets: []
---

# App shell chrome

Visitor mode: Operate.

## Audience and job

Authenticated operators moving between Canvas and Agency (Tracker through Management panes) for hours at a time. They need one-click access to nested Management destinations without losing Canvas in the rail.

## Outcome

- Connected sidebar + top bar shield (sidebar tokens) frames a rounded inset page well.
- Agency nav is a stable tree: segments plus always-visible Management children when the rail is pinned.
- Collapsed rail hover peek and mobile sheet expose the same destinations (including Resourcing, People, Money).
- Top bar stays contextual: pin, breadcrumb with segment/pane switcher, utilities — not a second nav tree.

## Direction

Zen-browser topology on incumbent Orch tokens: opaque chrome shield, hairline-framed page well, quiet thread line for nested rows. No drill-in rail replacement. No glass. No inner surface restyle in this pass.

## Scope

In: `apps/web/src/features/app-shell/`, shell CSS in `index.css`, shell padding classes in `app-shell-ui.ts`.

Out: Tracker, Reports, Money, Canvas board, node pages, Orch composer, route definitions.

## States

Pinned vs collapsed rail; spatial vs execution well background; mobile sheet; boot/update overlay on well; keyboard `g` chords and crumb menu parity for management panes.

## Open

Inner Agency/Canvas page styling inside the well is a follow-up pass.
