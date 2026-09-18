# SaaS UI and UX that shipped

Agency-first Polar billing across slices 1–5 on `from-brainiac-to-orch`. This document describes what people see. Internal Polar ids and service gates are omitted.

| Metric | Value |
| --- | --- |
| Slices shipped | 5 |
| Visible UX changes | 22 |
| Billing screens saying "Pro" | 0 |
| Live landing table | `/#pricing` |

## Voice

- Sentence case. No exclamation marks.
- Never say Pro on billing surfaces.
- Orch model picker Fast / Balanced / Pro is a model tier and was not renamed.

## What changed on screen

| Slice | Surface | Before | After |
| --- | --- | --- | --- |
| 1 | Signup | No Agency until Polar Pro | Creates {name}'s agency, owner, 30-day trial |
| 1 | `/agency/*` leftover | Actor Polar Pro upsell, or hard fail | Trial ended paywall. Subscribe — 1 seat. Open Canvas |
| 1 | Featured rail notifications | Pro-gated; leftover users 403 | Auth-only. Shell chrome stays on leftover |
| 1 | Billing chrome | Login Polar user tier | Selected team snapshot, not the actor's Polar |
| 2 | Create clients / projects / tasks / nodes | Silent or generic fail at volume | This agency can have n {noun} on {plan}. Subscribe to add more. |
| 2 | Task / knowledge uploads | Size-only, or available on leftover | File uploads are included with Agency. Subscribe to attach files. |
| 3 | Invite during trial | Inserts a member, or generic error | Add a seat. Trial is solo. Continue to checkout / Cancel |
| 3 | Invite when seats are full | Member appears then fails | Every member needs a seat. Add a seat to invite them. |
| 3 | Orch at included cap | No meter, or looks unlimited | This agency has used its included Orch messages. Buy credits to continue. |
| 3 | `/billing/success` Agency | Generic Polar success | Agency is active. Open Tracker / Manage billing |
| 3 | `/billing/success` credits | Looked like Agency was now paid | Orch credits added. Leftover still leftover. Open Canvas or Tracker |
| 3 | Checkout fail | Silent or Polar error | Checkout didn't finish. Try again. |
| 4 | Clients / Projects create | Owner-only New client / New project | Editors get create, archive, name, icon. Rates stay owner |
| 4 | Project page Add task | Form always shown; viewers 403 | Hidden unless editor or owner |
| 4 | Tags / journey | Create looked owner-only | Tag create and journey edit only with editor records |
| 4 | My Tasks edit dialog | Viewers saw a Save form | Viewers: disabled fields, Close only. Rate still owner |
| 4 | Tracker live timers | Whole team for every role | Viewer sees only their own running timer |
| 4 | Agency Dashboard | Any role could fire the team report | Owner only. Editors and viewers do not load the scoreboard |
| 4 | Role miss | UNAUTHORIZED, looks like signed out | You need editor access… or Only the owner can change billing and invoices. |
| 5 | Landing `/#pricing` | Dead Pro table, or unused component | Live table: Trial / leftover, Agency $19/seat, Agency Unlimited $19/seat |
| 5 | Landing CTAs | Upgrade to Pro. Trial looked paid | Get started, Subscribe — 1 seat, Subscribe, or Manage billing by plan |
| 5 | Mobile rail leftover | Get Pro when !isPro | Subscribe — 1 seat only on leftover, checkout agency |
| 5 | Settings billing + account subtitle | Pro / Free, Upgrade to Pro | Trial, Leftover, Agency, Agency Unlimited. Subscribe — 1 seat or Manage billing |

## Intentionally unchanged

- Tracker still follows Clockify live-log UX.
- Money, reports, people policy, and Polar seats stay owner-only.
- Canvas leftover still works at 3 nodes / 2 blocks.
- Orch composer Fast / Balanced / Pro is still a model tier.

## Role chrome (slice 4)

Every role is a full seat. Create buttons use `canEditRecords` (owner or editor). Rate, currency, category, and money stay owner.

| Action | Viewer | Editor | Owner |
| --- | --- | --- | --- |
| Own time + own live timer | Yes | Yes | Yes |
| Team live timers / everyone's time | No | Yes | Yes |
| New client / project / task / tag / journey | Hidden | Yes | Yes |
| Client or task rate, currency, category | No | No | Yes |
| Money, invoices, reports, seats | No | No | Yes |
| My Tasks Save | Close only | Yes, no rate | Yes |
| Agency Dashboard team hours | No request | No request | Yes |

## Locked screens

### Trial ended paywall

- Agency
- Trial ended
- Subscribe to keep Tracker, projects, money, and people for this agency. Canvas stays available on the leftover limits.
- Subscribe — 1 seat
- Open Canvas

### Landing headline

- Free to try. Agency when the trial ends.
- Start on a 30-day Agency trial. After that, leftover Canvas stays on the leftover limits. Subscribe for seats when you are ready.

### Seat invite

- Add a seat
- Trial is solo. Adding someone starts Agency billing for this team.
- Every member needs a seat. Add a seat to invite them.
- Continue to checkout / Cancel

### Agency checkout success

- Agency is active
- This team can use Tracker, projects, money, and people.
- Open Tracker / Manage billing

## Landing table (slice 5)

Mounted on `/` after the hero. Hash `/#pricing`. Polar cancel returns here.

| Plan | Price | Agency | Orch | Files |
| --- | --- | --- | --- | --- |
| Trial / leftover | Free to try | Trial only, then off | 5 total | No |
| Agency | $19 / seat / month | On, capped | 50 / seat / month | 50 MB / file |
| Agency Unlimited | $19 / seat / month | On, uncapped | 200 / seat / month | 50 MB / file |

## Leftover is not a dead app

After day 30 without a subscription, Agency routes show the paywall. Canvas stays. Credits can still be bought. Paying restores the same Agency.
