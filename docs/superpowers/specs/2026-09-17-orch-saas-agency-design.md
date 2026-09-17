# Orch SaaS — Agency entitlements design

Date: 2026-09-17
Status: approved in conversation; implementation is sliced (see plans)

GTM is agencies first. A solo operator is a 1-seat Agency, not a cut-down Canvas product. Polar bills the Agency team. Personal is marketing language for one seat.

## Problem

Orch already has Polar checkout, a Free/Pro table, and a hard Agency gate. It cannot be sold as a public SaaS.

Billing is resolved from `getBillingStateForUser(session.user.id)` (`packages/api/src/billing-guard.ts`). Polar customers use `externalId: user.id` (`packages/auth/src/index.ts`). `protectedProProcedure` (`packages/api/src/procedures.ts`) therefore grants Agency to the **actor’s** Polar tier. A paying owner’s teammate without their own subscription hits the Agency upsell.

Several advertised limits never run: `blocksPerTab`, `tabsPerNode`, `teamMembers`. Pro `aiConversations: -1` is not metered; model spend is the operator OpenRouter key. Notifications are Pro-gated even though they are shell chrome. There is no auto-created Agency on signup. Lifetime Pro is a user flag, not a SKU.

Constraints we cannot break: golden-file layers, `requireTeamMembership` before team writes, Polar + Better Auth checkout/portal, Clockify-parity Tracker UX, PRODUCT.md voice (no puffery, no exclamation marks).

## Usage (caller’s view)

```ts
// Service: membership then entitlement. Views never see Polar.
const role = await requireTeamMembership(actorUserId, input.teamId, "editor");
await assertAgencyEntitled(input.teamId);
await assertWithinLimit(input.teamId, "clients");

// Web: current Agency team, not the login’s Polar user.
const { snapshot, checkoutSeats, openPortal } = useAgencyBilling(teamId);

// Owner invite when seats are full.
await checkoutSeats({ teamId, quantity: snapshot.seats + 1 });
```

Signup creates `{name}'s agency`, starts a 30-day trial, owner role. After day 30 without a subscription, `/agency/*` shows the paywall; Canvas leftover remains. Invite during trial is checkout for seat 2.

## Catalog

Polar SKUs: **Agency** and **Agency Unlimited**, $19/seat/month. Checkout slugs `agency` and `agency-unlimited`. One billable Agency per subscription. Seat count = active members including the owner. Role does not change price.

| State | Agency product | Volume | Orch | Extras |
|---|---|---|---|---|
| Trial (30 days) | Full, solo only | 10 clients, 30 projects, 2 tasks/project, 3 nodes, 2 blocks | 5 messages total | No branded invoices, no marketplace, no task/knowledge files |
| Leftover (unpaid after trial) | Off | Canvas 3 nodes, 2 blocks | 5 lifetime messages; credit packs allowed | Same extras locked |
| Agency ($19/seat) | On for billed seats | 100 clients, 300 projects, 50 tasks/project, 50 nodes, 24 blocks/tab, 12 tabs/node | 50 messages/seat/month, then packs | Branded invoices, marketplace view, 50 MB/file |
| Agency Unlimited | On | Uncapped data | 200 messages/seat/month, then packs | Marketplace publish, 50 MB/file |

No GB storage pool. Avatars and team logo stay allowed on leftover. Task-thread and knowledge uploads are off on trial/leftover; 50 MB per file on paid (today’s per-file cap, not a new meter).

Invite during trial starts checkout for seat 2 and converts the team to paid Agency. Day 31 unpaid: Agency RPC `FORBIDDEN` with `code: "trial_ended"`. Data is not deleted. Paying restores the same Agency.

Orch is never unlimited. Leftover and paid can buy Polar credit packs.

Lifetime `user.lifetimePro` grandfathers as Agency Unlimited, 1 seat, on the owned Agency. Extra members still need seats. No new lifetime SKU.

v1 does not sell a second billable Agency, annual SKUs, SSO, 5-seat minimums, or Polar-per-user Pro.

## Shape

**Deep module:** `packages/api/src/billing-team.ts` (name locked). Public surface:

```ts
export type AgencyPlan = "trial" | "leftover" | "agency" | "agency_unlimited";

export type TeamBillingSnapshot = {
  teamId: string;
  plan: AgencyPlan;
  seats: number;
  trialEndsAt: string; // ISO
  polarSubscriptionId: string | null;
  polarProductId: string | null;
  orchMessagesUsed: number;
  orchMessagesIncluded: number;
  orchCreditsRemaining: number;
  limits: AgencyPlanLimits;
};

export async function getTeamBilling(teamId: string, now?: Date): Promise<TeamBillingSnapshot>;
export async function assertAgencyEntitled(teamId: string, now?: Date): Promise<TeamBillingSnapshot>;
export async function assertWithinLimit(
  teamId: string,
  counter:
    | "clients"
    | "projects"
    | "tasksPerProject"
    | "nodes"
    | "blocks"
    | "tabs"
    | "members"
    | "orchMessages",
  extra?: { projectId?: string },
): Promise<void>;
export async function applyPolarSnapshot(teamId: string, polar: PolarSubscriptionView): Promise<void>;
```

Services call these after `requireTeamMembership`. Routers stay thin. Views receive `FORBIDDEN` with `data.code` and display-ready `message`. Polar SDK types do not leak past `applyPolarSnapshot`.

Postgres table `workspace_team_billing` (1:1 with `workspace_team`) is the read model. Polar webhooks and checkout-success refresh it. Checkout success also refreshes so a late webhook cannot trap the owner.

`protectedProProcedure` is removed from Agency, notifications, and marketplace. Replacements:

- Agency ops: `protectedProcedure` + `assertAgencyEntitled(teamId)` in the service (teamId is already on inputs).
- Notifications: `protectedProcedure` only. Shell chrome is not an Agency SKU. Today it is incorrectly Pro-gated (`packages/api/src/routers/notifications/router.ts`).
- Marketplace save: `assertAgencyEntitled` + Unlimited (or Agency for view; publish = Unlimited).
- Canvas save: leftover/trial node and block caps via `assertWithinLimit`, not the user Polar node cap.

Auto Agency: after user create (same hook that schedules Polar customer setup), `ensurePersonalAgency(userId, name)` creates the team, owner membership, and billing row `plan: "trial"`, `seats: 1`, `trialEndsAt: now + 30 days`. Manual `team.create` is not a second billable Agency in v1; extra teams stay forbidden (`assertCanCreateTeam` becomes “one Agency”).

Polar customer remains the **billing owner user** (`externalId` unchanged). Subscription metadata carries `teamId`. Quantity is seat count. This avoids Polar organizations in v1. Owner change later must transfer Polar customer; out of scope.

`now` is injectable in tests so day-31 is not a wall clock.

## RBAC

Keep `owner | editor | viewer`. Every role is a full seat. Failed role checks throw `FORBIDDEN` with `code: "insufficient_role"` (today they throw `UNAUTHORIZED`, which looks like a session miss).

| Capability | Viewer | Editor | Owner |
|---|---|---|---|
| Own time | Yes | Yes | Yes |
| Everyone’s time | No | Yes | Yes |
| Live timers | Self only | Team | Team |
| Task thread read | Yes | Yes | Yes |
| Task thread send | Assignee or team-assigned | Same | Same |
| Projects, tasks, tags, templates, journey | No | Yes | Yes |
| Client record (name, icon, archive) | No | Yes | Yes |
| Client rates, currency, commercial category | No | No | Yes |
| Money, invoices, FX, expenses, payouts | No | No | Yes |
| Reports studio | No | No | Yes |
| People policy, tenure, departments | No | No | Yes |
| Alerts / off-days for others | No | Yes | Yes |
| Seats, Polar, invite, roles | No | No | Yes |
| Canvas team nodes | No | Yes | Yes |

`canViewBilling` on client cards stays owner. Editors can file a client so a project has a home; they cannot set the rate invoices use.

Money scoreboard must require owner (today `getPeriodScoreboard` is `viewer` while money writes are `owner`). Reports stay owner. `listAgencyActiveMembers` filters to self for viewers.

Editor writes that move from owner: `createAgencyClient` / `updateAgencyClient` for non-rate fields; `createAgencyProject*` ; `createAgencyProjectTask`; tags; project templates. Rate/currency/category still owner.

## UX copy

Voice: PRODUCT.md. Sentence case. No exclamation marks. No “Pro”.

**Trial ended (Agency routes)**

- Eyebrow: Agency
- Title: Trial ended
- Body: Subscribe to keep Tracker, projects, money, and people for this agency. Canvas stays available on the leftover limits.
- Primary: Subscribe — 1 seat
- Secondary: Open Canvas

**During trial, invite**

- Title: Add a seat
- Body: Trial is solo. Adding someone starts Agency billing for this team.
- Primary: Continue to checkout
- Secondary: Cancel

**Cap (inline / dialog)**

- Pattern: `{This agency can have n {noun} on {plan}.} {Subscribe to add more.|Buy credits to continue.}`
- Clients example: This agency can have 10 clients on the trial. Subscribe to add more.
- Orch example: This agency has used its included Orch messages. Buy credits to continue.
- Seats: Every member needs a seat. Add a seat to invite them.
- Uploads on leftover: File uploads are included with Agency. Subscribe to attach files.
- Role: Only the owner can change billing and invoices.

**Checkout success**

- Title: Agency is active
- Body: This team can use Tracker, projects, money, and people.
- Primary: Open Tracker
- Secondary: Manage billing

**Landing pricing**

- Headline: Free to try. Agency when the trial ends.
- Free column becomes Trial / leftover, not “$0 forever Agency”.
- Paid columns: Agency $19/seat, Agency Unlimited. Drop “Pro”.

Error `data.code` values (locked): `trial_ended`, `not_entitled`, `limit_reached`, `seat_required`, `orch_credits`, `upload_blocked`, `insufficient_role`, `marketplace_blocked`.

## Synthesis decision

Grounding: Polar + Free/Pro walkthrough ([billing explorer](bb2ee5e5-b6ac-4886-837f-5a8e1f95b82f)). Arena models from the architect skill are not in this session’s runner list, so two shapes were sketched here and screened against `design-red-flags.md`.

**Base: team billing snapshot.** One module hides Polar, trial clock, seats, and counters. Callers pass `teamId`. High interface depth: services do not coordinate Polar + clock + caps.

**Rejected: live Polar on the owner user.** `getBillingStateForUser(ownerId)` at each Agency RPC. Members would work, but Polar types and owner lookup leak into every service; owner leave / two teams / webhook lag stay unsolved. Shallow: callers still think in Polar customers.

**Rejected: Polar organizations as source of truth without a snapshot.** Polar downtime would take Agency down. Polar seat objects would become the domain model (information leakage). Snapshot plus Polar as the write-side remains.

Grafted: keep Polar customer as the billing owner user (no Polar org in v1); metadata `teamId` + quantity; checkout-success refresh in addition to webhooks.

## Tradeoffs accepted

- We accept Polar remaining on the owner user in exchange for not blocking launch on Polar organizations.
- We accept one billable Agency per owner in v1 in exchange for a simple seat quantity.
- We accept notifications on leftover (auth-only) in exchange for not breaking the featured rail when Agency is paywalled.
- We accept 50 MB per file with no GB pool in exchange for not building a storage ledger.
- We accept grandfathering lifetime Pro as Unlimited 1-seat in exchange for not selling a lifetime SKU.

## Alternatives considered

- Per-user Polar Pro (current): rejected; teammates cannot work.
- Personal $19 SKU plus extra seats: rejected; agencies buy per seat from 1.
- 5-seat minimum: rejected; contradicts full Agency alone.
- Collapse editor/viewer: rejected; contractors need a viewer who only tracks themselves.

## Error handling

Polar down at checkout: no snapshot write, existing plan unchanged, “Checkout didn’t finish. Try again.”
Webhook late: checkout success calls `applyPolarSnapshot`.
Over-limit: fail the create; do not truncate.
Credit pack: idempotent on Polar `checkout_id`.

## Testing (must be API-true)

- Trial writes succeed on day 1; `trial_ended` after day 30 without a subscription.
- Leftover: Agency list/get fail; canvas over 3 nodes / 2 blocks fail; Orch message 6 fails without credits.
- Member of a paying Agency uses Agency without their own Polar customer.
- Seat 2 without quantity+1 fails; after snapshot seats=2, add succeeds.
- Trial caps: 11th client, 31st project, 3rd task on a project fail.
- Agency caps fail at 101 / 301 / 51; Unlimited does not.
- Uploads 403 on trial/leftover; 50 MB+1 rejected on paid.
- Lifetime → Unlimited 1 seat; extra members need seats.
- Editor creates project/task/client record; editor setting a rate is `insufficient_role`.
- Viewer sees only their live timer.
- Role miss is `FORBIDDEN`, not `UNAUTHORIZED`.

## Blast radius

**What changes.** Agency access, pricing copy, who can create projects/clients, notification procedure tier, Polar product slugs.

**The one fact it is safe because of.** Agency API access today is the **actor Polar tier**, not team membership.

Proof (step 4, ran in this session):

```
bun test packages/api/src/billing.test.ts
# 4 pass — free has no Polar sub; lifetime/Polar map to Pro limits including agencyOps
```

`requirePro` calls `getBillingStateForUser(context.session.user.id)` at `packages/api/src/procedures.ts:38`. `normalizeBillingState` has no `teamId`. Therefore switching the gate to `assertAgencyEntitled(teamId)` is a behavior change for teammates, which is the point. Unproven in-app: a live teammate session (needs a browser Pro owner + free member).

**Risks**

| Break | Where | Chance | Cost | Check |
|---|---|---|---|---|
| Featured rail dies for leftover users if notifications stay Pro-gated | `notifications/router.ts` `protectedProProcedure` | High if we only swap Agency and forget chrome | Shell footer errors | Slice 1 drops Pro on notifications |
| `any active Polar sub = Pro` (`billing.ts:81`) would treat credit-pack-only as Agency | `normalizeBillingState` | Medium once packs exist | Free leftover accidentally entitled | Snapshot matches product IDs only; delete the any-sub fallback |
| Editor project create still owner until RBAC slice | `projects/service.ts:247`, `tasks/service.ts:534` | Certain until that slice | Editors still blocked | Slice 4 tests |
| Boot prefetch `billing.state` without teamId | `authenticated-boot.ts` | High | Upsell flicker | `billing.state` requires `teamId`; boot uses selected team |
| Webhook lag after checkout | Polar plugin webhooks | Medium | Paywall after paying | Checkout success refreshes snapshot |
| Timer `getActive` without teamId | `time-tracking/service.ts` | Medium | Entitlement skipped | Resolve team from timer then assert |

**Cleared**

- Agency Money routers (`agency-ops/billing`) are invoices, not Polar. Do not confuse them with subscription billing.
- Canvas leftover can keep working; `workspace.save` is `protectedProcedure` plus node assert, not Pro.
- `canViewBilling` already hides rates from non-owners.

**Before merge of slice 1**

- Integration: owner trial, second user member, Agency list as member (must succeed during trial / paid).
- Leftover clock: `getTeamBilling(teamId, trialEndsAt + 1s).plan === "leftover"` and Agency list `trial_ended`.
- Shell: leftover user loads `/canvas` without notification RPC 403.

## Implementation slices

Do not implement this spec as one PR. Each slice is its own plan file and must ship testable software.

1. `docs/superpowers/plans/2026-09-17-orch-saas-agency-slice-1-team-entitlements.md` — snapshot, auto Agency, trial clock, team-scoped billing.state, drop user Pro gate, notifications auth-only, paywall copy.
2. `docs/superpowers/plans/2026-09-17-orch-saas-agency-slice-2-volume-caps.md` — counters and upload block (write after slice 1).
3. `docs/superpowers/plans/2026-09-17-orch-saas-agency-slice-3-seats-credits.md` — Polar quantity, invite checkout, Orch packs (write after slice 2).
4. `docs/superpowers/plans/2026-09-17-orch-saas-agency-slice-4-rbac.md` — editor work book, hole fixes (write after slice 3).
5. `docs/superpowers/plans/2026-09-17-orch-saas-agency-slice-5-catalog.md` — landing pricing, Polar product IDs, drop Pro copy (write after slice 4).

## Next implementation step

Write failing tests for `getTeamBilling` / `assertAgencyEntitled` against a trial row, then implement slice 1.
