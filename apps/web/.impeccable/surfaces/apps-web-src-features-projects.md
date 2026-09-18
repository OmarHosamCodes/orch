---
version: 1
slug: "apps-web-src-features-projects"
primary_target: "apps/web/src/features/projects"
related_targets: ["apps/web/src/features/clients/clients-book-corridors.ts","apps/web/src/features/shared/agency-detail-instrument-plate.tsx","apps/web/src/features/shared/agency-segment-filters.tsx"]
---

Visitor mode: Operate. Scope: Agency Projects list (`/agency/projects`) and project detail (`/agency/projects/:id`).

Audience: agency owners first (budget, rates, trash), members second (find project, open tasks, track time). Job: scan delivery health, open one project, manage tasks/journey, override rate, review activity.

Action: search/filter the book, open a project, restore/trash, edit commercial rate, continue execution. Proof: live `projects.list`, `budgets.list`, time entries, tasks, journey, and project detail hooks.

Constraints: inherit Clients hybrid Operate language; command bar distilled to segment-relevant filters; D01 instrument plates; soft-delete trash model; `hh:mm:ss`; no billing corridors at project level; Journey/tasks/activity stay first-class.

Chosen direction: hybrid (same family as Clients). List is **07 Corridor Board** with delivery corridors (At risk → Active this week → Quiet → In trash). Detail is **03 Split Inspector** (identity + plates, execution left | commercial + hours right). Memorable moment: At risk corridor + budget plate scrolls to commercial.

## Direction contract

THESIS: Projects is a delivery corridor board for budget and activity triage, not a Clockify register; opening a project inspects execution on the left and commercial on the right.

OWN-WORLD: Agency dark shadcn surfaces, hairline grouped rows, D01 instrument plates (neutral card, glyph ink only), overflow ⋮, warning chips for budget risk.

STORY: An owner scans At risk / Active / Quiet / In trash, opens a hot project, fixes rate or budget from the plate, or continues tasks without leaving the inspect column.

FIRST VIEWPORT: List — corridor labels with counts, hairline rows (mark + name + needs, client, week bar, budget %, overflow). Detail — back, identity header, four plates, split Journey/Tasks/Activity | Commercial/Hours.

FORM: Clients hybrid extended to Projects; list 07 Corridor Board (delivery corridors), detail 03 Split Inspector.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
