---
version: 1
slug: "apps-web-src-features-member-profile"
primary_target: "apps/web/src/features/member-profile"
related_targets: []
---

Visitor mode: Operate. Scope: Agency member profile (`/agency/members/:userId` and `/agency/me`) as a one-page period-health dashboard.

Audience: managers or the member mid-period or at close. Job: see whether this person is on track, act on alerts and off days, then drill into the activity log without leaving the page.

Action: read period health (instrument plates), act the alerts queue, operate attendance on the calendar, then scan Activity & reviews. Proof: Off days / Hours / Present / Waste plates, alerts with note/notify/snooze/dismiss, contribution calendar plus off-day dialogs, merged activity/reviews, roster switcher, tenure-aware period.

Constraints: Orch quiet instrument and D01 glyphs only on plates/alerts; no new routes or capabilities; no in-page Ask Orch card (top-bar companion owns Orch); no max-width well; golden-file layers; existing gauge morph and leave/HR/review dialogs. Personal/HR fields stay behind edit.

Direction: Period Health Dashboard (Money analog). Command bar full width, compact identity strip, split hero (plates left, alerts right, equal height), remaining height is calendar plus activity drill. Memorable moment: largest open alert beside Hours / Off days / Streak in the first viewport.
