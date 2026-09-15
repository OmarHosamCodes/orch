---
version: 1
slug: "apps-web-src-features-dashboard"
primary_target: "apps/web/src/features/dashboard"
related_targets: ["apps/web/src/features/shared/agency-hour-breakdown-metrics.ts","apps/web/src/features/member-profile/member-profile-instrument-plate.tsx"]
---

Visitor mode: Operate. Scope: Agency Dashboard hours instrument (the former Project share + Ranked projects pair).

Audience: agency operators scanning this month’s mix. Job: see where hours went (projects) and what those hours are worth (Paid, Waste, Internal billable, Internal non-billable) in one panel.

Action: read mix at rest; click project or client names to open that project or client. Proof: live dashboard summary metrics, second-precise durations, shared hour-breakdown composition with Reports.

Constraints: one card; team-level quality (not per-project); top 10 projects; no donut; Team activity Activity column uses shadcn Badge and opens a member activity Sheet (allocation breakdown + profile CTA); page filters untouched; dark Agency tokens; D01 instrument plates.

Direction: D01 instrument plates (Paid / Waste / Billable / Non-billable) at rest with tracked total in header; ranked projects list always visible below.
