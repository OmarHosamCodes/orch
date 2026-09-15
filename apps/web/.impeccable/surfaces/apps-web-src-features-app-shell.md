---
version: 1
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
| **01 Traveling blob** (shipped) | One `liquid-gooey` selection mass moves between rail rows; context-bar Current Title morphs in sync; notification `9+` badge melts in/out. | — |
| 02 Cluster melt | Canvas solitary; Agency destinations fused; Management a second fused cluster. | Higher visual noise; slower scan for power users jumping segments. |
| 03 Shared-spine bead | Thread line kept; gooey bead slides the spine. | Competes with existing nested thread grammar; less clear on nested Management panes. |

Speed rules: TanStack `defaultPreload: "intent"` kept; authenticated route hops skip page-enter fades; navigation commits before the blob finishes; `prefers-reduced-motion` snaps the blob with no filter.

Implementation: `liquid-gooey` in `shell-liquid-nav.tsx`, `shell-liquid-badge.tsx`, `shell-nav-selection.ts`. Blob target for the bar is unified `context-location-title`. Not liquid glass.

## Current Title location chrome (2026-09-15)

Shape brief compared four location-chrome jobs in Open Design project orch-shell-location-chrome-9ddb; **01 Current Title** shipped.

| Direction | Interaction | Why not chosen |
|---|---|---|
| **01 Current Title** (shipped) | One leaf title + chevron opens grouped destinations (Products, Agency, Management). Nested pages add a quiet parent back. Mobile hamburger lives in the bar. | — |
| 02 Nested Trail | Linear-style ancestor crumbs. | Extra chrome for operators who already have the rail. |
| 03 Product + Place | Dual chips. | Two controls for one location. |
| 04 Jump Control | Command-field wayfinder. | That job already belongs to ⌘K. |

Constraints: no create-from-picker; no team switcher in the bar; overlay names from existing caches only; `g`+letter shortcuts stay; WCAG AA and `prefers-reduced-motion`.

## Direction contract

THESIS: One continuous workspace, with grain confined to its connected outer shell and instant content inside it. Location chrome is one current place, not a nested trail.

OWN-WORLD: Existing Orch dark zinc surface ladder with monochrome primary CTAs and Operator Violet accents. Shared 16px surface corners, 20px desktop interior gutters, 12px mobile gutters; the existing 12px shell inset remains. One neutral background across pages, panels, and dialogs. Semantic controls retain their shapes.

STORY: Operators read where they are, open grouped destinations, or take one quiet back step on nested pages — without relearning panel hierarchy.

FIRST VIEWPORT: Full-height expanded 248px left sidebar, connected 44px context bar with Current Title (hamburger on small screens, optional parent back, leaf title + chevron; bell and CloudOff on the right), rounded inset page well, then a single interior gutter.

FORM: User-selected Continuous surface, option 01, plus Traveling blob liquid chrome and Current Title location chrome. Reference: Linear project overview https://mobbin.com/screens/267d16a1-982b-4479-85b5-22294fdab01a.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Verification

Actual authenticated routes at desktop and mobile: Dashboard, nested People/member, Canvas/node, notifications, sync error, Arabic overflow, collapsed-width mobile drawer. Check grain ownership, Current Title, parent back, destination menu, traveling blob on the title, focus, reduced motion, and overflow. TypeScript and shell tests must pass. No new raster assets.
