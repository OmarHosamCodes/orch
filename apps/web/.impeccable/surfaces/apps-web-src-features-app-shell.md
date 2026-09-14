---
version: 2
slug: "apps-web-src-features-app-shell"
primary_target: "apps/web/src/features/app-shell"
related_targets: ["apps/web/src/ui","apps/web/src/pages","apps/web/src/features/shared/agency-ui.ts"]
---

# Authenticated surface system

Visitor mode: Operate. Scope: all authenticated pages, panels, node editors, and dialogs.

The user selected 01 Continuous surface on 2026-09-15 after comparing three live application directions in Open Design project 3dc5e4e5-1ab7-40fa-a29f-8d0c1e3f7977. Desktop navigation stays expanded; mobile retains a drawer. Preserve all route features, fonts, semantic indicators, and working controls.

## Liquid destination chrome (2026-09-15)

Shape brief evaluated three navigation motion directions; **01 Traveling blob** shipped.

| Direction | Interaction | Why not chosen |
|---|---|---|
| **01 Traveling blob** (shipped) | One `liquid-gooey` selection mass moves between rail rows; context-bar segment crumb morphs in sync; notification `9+` badge melts in/out. | — |
| 02 Cluster melt | Canvas solitary; Agency destinations fused; Management a second fused cluster. | Higher visual noise; slower scan for power users jumping segments. |
| 03 Shared-spine bead | Thread line kept; gooey bead slides the spine. | Competes with existing nested thread grammar; less clear on nested Management panes. |

Speed rules: TanStack `defaultPreload: "intent"` kept; authenticated route hops skip page-enter fades; navigation commits before the blob finishes; `prefers-reduced-motion` snaps the blob with no filter.

Implementation: `liquid-gooey` in `shell-liquid-nav.tsx`, `shell-liquid-badge.tsx`, `shell-nav-selection.ts`. Not liquid glass.

## Direction contract

THESIS: One continuous workspace, with grain confined to its connected outer shell and instant content inside it.

OWN-WORLD: Existing Orch dark zinc surface ladder with monochrome primary CTAs and Operator Violet accents. Shared 16px surface corners, 20px desktop interior gutters, 12px mobile gutters; the existing 12px shell inset remains. One neutral background across pages, panels, and dialogs. Semantic controls retain their shapes.

STORY: Operators move between Canvas, tasks, reports, and management without relearning panel hierarchy or losing navigation.

FIRST VIEWPORT: Full-height expanded 248px left sidebar, connected 44px context bar without a collapse control, rounded inset page well, then a single interior gutter. Tracker reflows with available width; canvas geometry and internal scrolling remain intact.

FORM: User-selected Continuous surface, option 01, plus Traveling blob liquid chrome. Reference: Linear project overview https://mobbin.com/screens/267d16a1-982b-4479-85b5-22294fdab01a.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Verification

Actual authenticated routes and dialogs at 967px, wide desktop, and mobile. Check grain ownership, corner/background consistency, gutter ownership, liquid nav blob travel, context-bar crumb morph, notification badge melt, focus, reduced motion, and overflow. TypeScript and existing shell tests must pass. No new raster assets.
