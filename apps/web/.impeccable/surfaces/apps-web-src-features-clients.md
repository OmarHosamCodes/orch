---
version: 1
slug: "apps-web-src-features-clients"
primary_target: "apps/web/src/features/clients"
related_targets: ["packages/api/src/routers/agency-ops/clients","apps/web/src/features/shared/agency-segment-filters.tsx","apps/web/src/features/member-profile/member-profile-instrument-plate.tsx"]
---

Visitor mode: Operate. Scope: Agency Clients list (`/agency/clients`) and client detail (`/agency/clients/:id`).

Audience: agency owners first, members second. Job: scan the book of clients, open one, edit commercial/contact, start a project, jump to Money when work is ready to bill.

Action: search/filter the book, open a client, mutate commercial/contact, create a project, archive/unarchive. Proof: live `clients.list` plus `clients.bookIndex` (week hours, uninvoiced, outstanding, contact) and `clients.commercialSummary` on detail.

Constraints: inherit Agency quiet instrument; keep command bar, shell, DESIGN.md; owner-gated Money; integer minor units; `hh:mm:ss`; no invented CRM fields; no nested cards; no Clockify table clone.

Chosen direction: hybrid. List is **07 Corridor Board** (concept-seed surface default). Detail is **03 Split Inspector** full page (identity, D01 plates, projects | commercial+contact, Money strip). Memorable moment: needs chips sit next to the name, week heat is a bar, Ready corridor leads.

## Direction contract

THESIS: Clients is a corridor board of who needs action, not a Clockify-style register; opening a client inspects work on the left and commercial/contact on the right.

OWN-WORLD: Agency dark shadcn surfaces, hairline grouped rows, D01 instrument plates (neutral card, glyph ink only), overflow ⋮, warning chips for billing needs.

STORY: An owner scans Ready / Working / Quiet / Internal / Archived, opens a hot client, bills from the plate, or fixes rate and contact without leaving the inspect column.

FIRST VIEWPORT: List — corridor labels with counts, hairline rows (name + needs, project line, week bar, rate, overflow). Detail — back, identity header, four plates, split projects | forms, Money strip.

FORM: User pick after Open Design tournament; list 07 Corridor Board (seed assigned index 7), detail 03 Split Inspector. Standing exit (Harvest table + stacked settings) refused.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
