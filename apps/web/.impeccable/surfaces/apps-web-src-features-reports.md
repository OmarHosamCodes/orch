---
version: 1
slug: "apps-web-src-features-reports"
primary_target: "apps/web/src/features/reports"
related_targets: ["packages/api/src/routers/agency-ops/reports"]
---

Visitor mode: Operate. Scope: Agency Reports compose studio (`/agency/reports` and `/agency/reports/$reportId`).

Audience: owners/managers (sometimes members) shaping a timesheet document for a period. Job: change range, parties, columns, waste, or merge and see the export without waiting for a 2,700-row table, then export Excel (combined or per client). Tracker remains the Clockify-adjacent log editor.

Action: edit first-class Scope / Shape / Recipes / Export; proof is the paper preview. Inspect or fix a cluster only through the existing Tracker-style details dialog. Saved reports are recipes (filters + exclusions), not frozen row snapshots; `$reportId` hydrates the same studio.

Constraints: incumbent Agency DESIGN.md / shadcn quiet instrument; no command-bar stacked above a dumped table; no nested cards or liquid glass; no BI charts; no 5k index fetch; preview caps about 3 client blocks and ~8 aggregated rows per shown client with omitted counts; hour totals from SQL summary; waste/grouping/amount/`nH:nM:nS` product rules stay; Excel styling/grouping/per-client files untouched.

Direction: options are the work; the paper preview is the proof. Desktop two panes (sticky options, trailing document). Mobile stacks options then document. Focal moment: toggling a column or waste source immediately restyles the paper so Export is trusted.
