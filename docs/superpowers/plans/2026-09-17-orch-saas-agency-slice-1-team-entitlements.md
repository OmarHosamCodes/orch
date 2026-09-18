# Orch SaaS Agency Slice 1 — Team entitlements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Agency access a property of the current team (trial or paid snapshot), auto-create `{name}'s agency` on signup, and stop gating Agency and notifications on the actor’s Polar user.

**Architecture:** Postgres `workspace_team_billing` is the read model. Services call `assertAgencyEntitled(teamId)` after `requireTeamMembership`. Polar still identifies the billing owner user; this slice only consumes an existing paid mapping for lifetime/Polar so a paying owner’s **teammates** inherit the team snapshot. Seat quantity, Orch packs, volume caps, editor RBAC, and landing catalog are later slices.

**Tech Stack:** Bun, Drizzle/Postgres, oRPC, Polar (existing customer = user id), TanStack Query, golden-file services.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-17-orch-saas-agency-design.md`
- Golden file: schema → service `(actorUserId, input)` → router `.parse()` → hook → container → view
- Views do not import oRPC, Polar, or `getBillingStateForUser`
- Copy: never say “Pro”; paywall strings are locked in the spec
- `FORBIDDEN` `data.code` values: `trial_ended`, `not_entitled` (others in later slices)
- Inject `now` into billing reads so tests do not wait 30 days
- Bun only; `bun test <file>` then `bun run check`, `bun run check-types`, `bun run check:conventions`; `bun run check:golden` when adding in-scope files
- Do not implement volume caps, Polar seat quantity, Orch credit packs, editor project-create, or landing rewrite in this slice
- Notifications must not use `protectedProProcedure` (featured rail)
- Default git branch `dev`; conventional commits

## File map

- Create: `packages/db/src/schema/team-billing.ts` — `workspaceTeamBilling` table
- Create: `packages/db/src/migrations/0072_workspace_team_billing.sql`
- Create: `packages/api/src/billing-team.ts` — snapshot + asserts
- Create: `packages/api/src/billing-team.test.ts` — clock and plan tests
- Create: `packages/api/src/routers/team/ensure-personal-agency.ts` — signup helper
- Create: `packages/api/src/routers/team/ensure-personal-agency.test.ts`
- Modify: `packages/workspace/src/tiers.ts` — `AgencyPlan` + limits; keep legacy `TIER_LIMITS` derived
- Modify: `packages/db/src/schema/team.ts` or index export for billing table
- Modify: `packages/db/src/schema/index.ts` — export
- Modify: `packages/db/src/migrations/meta/_journal.json`
- Modify: `packages/api/src/routers/team/service.ts` — insert billing row on create
- Modify: `packages/auth/src/index.ts` — `ensurePersonalAgency` after user create
- Modify: `packages/api/src/procedures.ts` — stop using user Polar for Agency
- Modify: `packages/api/src/routers/agency-ops/**/router.ts` — `protectedProProcedure` → `protectedProcedure` (entitlement in services)
- Modify: `packages/api/src/routers/agency-ops/**/service.ts` — `assertAgencyEntitled` after membership
- Modify: `packages/api/src/routers/notifications/router.ts` — `protectedProcedure`
- Modify: `packages/api/src/routers/billing/schemas.ts` + `router.ts` + `service.ts` — `teamId`
- Modify: `apps/web/src/features/billing/billing-queries.ts` — team-scoped state
- Modify: `apps/web/src/lib/authenticated-boot.ts` — prefetch with selected team
- Modify: `apps/web/src/pages/agency-page.tsx` + `agency-pro-upsell.tsx` — trial-ended copy
- Modify: `docs/golden-file-source-inventory.md` — new files

A helper that walks agency-ops services is allowed: `assertAgencyMember(actorUserId, teamId, minRole)` = membership + entitled. Do not add a pass-through that only forwards `requireTeamMembership`.

---

### Task 1: Plan types and trial clock (no I/O)

**Files:**
- Modify: `packages/workspace/src/tiers.ts`
- Create: `packages/workspace/src/tiers.test.ts`

**Interfaces:**
- Produces: `AgencyPlan`, `AgencyPlanLimits`, `AGENCY_PLAN_LIMITS`, `agencyEnabled(plan)`, `legacyTier(plan)`, existing `TIER_LIMITS` still compiles

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import {
  AGENCY_PLAN_LIMITS,
  agencyEnabled,
  legacyTier,
  resolvePlanAt,
  type AgencyPlan,
} from "./tiers";

describe("agency plans", () => {
  test("trial and paid enable Agency; leftover does not", () => {
    expect(agencyEnabled("trial")).toBe(true);
    expect(agencyEnabled("agency")).toBe(true);
    expect(agencyEnabled("agency_unlimited")).toBe(true);
    expect(agencyEnabled("leftover")).toBe(false);
  });

  test("after trialEndsAt the plan is leftover unless paid", () => {
    const trialEndsAt = new Date("2026-10-01T00:00:00.000Z");
    expect(resolvePlanAt({ storedPlan: "trial", trialEndsAt, now: new Date("2026-09-30T23:59:59.000Z") })).toBe(
      "trial",
    );
    expect(resolvePlanAt({ storedPlan: "trial", trialEndsAt, now: new Date("2026-10-01T00:00:01.000Z") })).toBe(
      "leftover",
    );
    expect(
      resolvePlanAt({
        storedPlan: "agency",
        trialEndsAt,
        now: new Date("2026-10-01T00:00:01.000Z"),
      }),
    ).toBe("agency");
  });

  test("legacy tier is pro for trial and paid, free for leftover", () => {
    expect(legacyTier("trial")).toBe("pro");
    expect(legacyTier("leftover")).toBe("free");
    expect(legacyTier("agency")).toBe("pro");
  });

  test("trial client cap is 10", () => {
    expect(AGENCY_PLAN_LIMITS.trial.clients).toBe(10);
    expect(AGENCY_PLAN_LIMITS.agency.clients).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/workspace/src/tiers.test.ts`

Expected: FAIL (exports missing)

- [ ] **Step 3: Write minimal implementation**

In `packages/workspace/src/tiers.ts` add (keep existing `TIERS` / `TIER_LIMITS` so current billing tests still typecheck):

```ts
export const AGENCY_PLANS = ["trial", "leftover", "agency", "agency_unlimited"] as const;
export type AgencyPlan = (typeof AGENCY_PLANS)[number];

export type AgencyPlanLimits = {
  clients: number | null;
  projects: number | null;
  tasksPerProject: number | null;
  workspaceNodes: number;
  blocksPerTab: number;
  tabsPerNode: number;
  teams: number;
  orchMessagesIncluded: number;
  orchMessagesPeriod: "lifetime" | "month";
  brandedInvoices: boolean;
  marketplaceView: boolean;
  marketplacePublish: boolean;
  taskAndKnowledgeUploads: boolean;
};

export const AGENCY_PLAN_LIMITS = {
  trial: {
    clients: 10,
    projects: 30,
    tasksPerProject: 2,
    workspaceNodes: 3,
    blocksPerTab: 2,
    tabsPerNode: 1,
    teams: 1,
    orchMessagesIncluded: 5,
    orchMessagesPeriod: "lifetime",
    brandedInvoices: false,
    marketplaceView: false,
    marketplacePublish: false,
    taskAndKnowledgeUploads: false,
  },
  leftover: {
    clients: 0,
    projects: 0,
    tasksPerProject: 0,
    workspaceNodes: 3,
    blocksPerTab: 2,
    tabsPerNode: 1,
    teams: 1,
    orchMessagesIncluded: 5,
    orchMessagesPeriod: "lifetime",
    brandedInvoices: false,
    marketplaceView: false,
    marketplacePublish: false,
    taskAndKnowledgeUploads: false,
  },
  agency: {
    clients: 100,
    projects: 300,
    tasksPerProject: 50,
    workspaceNodes: 50,
    blocksPerTab: 24,
    tabsPerNode: 12,
    teams: 1,
    orchMessagesIncluded: 50,
    orchMessagesPeriod: "month",
    brandedInvoices: true,
    marketplaceView: true,
    marketplacePublish: false,
    taskAndKnowledgeUploads: true,
  },
  agency_unlimited: {
    clients: null,
    projects: null,
    tasksPerProject: null,
    workspaceNodes: 10_000,
    blocksPerTab: 24,
    tabsPerNode: 12,
    teams: 1,
    orchMessagesIncluded: 200,
    orchMessagesPeriod: "month",
    brandedInvoices: true,
    marketplaceView: true,
    marketplacePublish: true,
    taskAndKnowledgeUploads: true,
  },
} as const satisfies Record<AgencyPlan, AgencyPlanLimits>;

export function agencyEnabled(plan: AgencyPlan): boolean {
  return plan === "trial" || plan === "agency" || plan === "agency_unlimited";
}

export function legacyTier(plan: AgencyPlan): "free" | "pro" {
  return agencyEnabled(plan) ? "pro" : "free";
}

export function resolvePlanAt(input: {
  storedPlan: AgencyPlan;
  trialEndsAt: Date;
  now: Date;
}): AgencyPlan {
  if (input.storedPlan === "trial" && input.now.getTime() > input.trialEndsAt.getTime()) {
    return "leftover";
  }
  return input.storedPlan;
}
```

Unlimited node cap uses a large number because canvas save already compares counts; slice 2 may switch to `null` = skip. Do not special-case `null` in this slice except storing it on the type.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/workspace/src/tiers.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/workspace/src/tiers.ts packages/workspace/src/tiers.test.ts
git commit -m "$(cat <<'EOF'
feat(billing): add Agency plan types and trial clock

EOF
)"
```

---

### Task 2: `workspace_team_billing` schema

**Files:**
- Create: `packages/db/src/schema/team-billing.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `packages/db/src/migrations/0072_workspace_team_billing.sql`
- Modify: `packages/db/src/migrations/meta/_journal.json`

**Interfaces:**
- Consumes: `workspaceTeam.id`
- Produces: `workspaceTeamBilling` Drizzle table

- [ ] **Step 1: Write schema + migration**

`packages/db/src/schema/team-billing.ts`:

```ts
import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { workspaceTeam } from "./team";

export type AgencyBillingStoredPlan = "trial" | "leftover" | "agency" | "agency_unlimited";

export const workspaceTeamBilling = pgTable(
  "workspace_team_billing",
  {
    teamId: text("team_id")
      .primaryKey()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    plan: text("plan").$type<AgencyBillingStoredPlan>().notNull().default("trial"),
    seats: integer("seats").notNull().default(1),
    trialEndsAt: timestamp("trial_ends_at").notNull(),
    polarSubscriptionId: text("polar_subscription_id"),
    polarProductId: text("polar_product_id"),
    orchMessagesUsed: integer("orch_messages_used").notNull().default(0),
    orchCreditsRemaining: integer("orch_credits_remaining").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("workspace_team_billing_polar_sub_idx").on(table.polarSubscriptionId)],
);
```

Migration `0072_workspace_team_billing.sql`:

```sql
CREATE TABLE "workspace_team_billing" (
  "team_id" text PRIMARY KEY NOT NULL REFERENCES "workspace_team"("id") ON DELETE CASCADE,
  "plan" text NOT NULL DEFAULT 'trial',
  "seats" integer NOT NULL DEFAULT 1,
  "trial_ends_at" timestamp NOT NULL,
  "polar_subscription_id" text,
  "polar_product_id" text,
  "orch_messages_used" integer NOT NULL DEFAULT 0,
  "orch_credits_remaining" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "workspace_team_billing_polar_sub_idx" ON "workspace_team_billing" ("polar_subscription_id");
```

Append journal like prior migrations. Export from `packages/db/src/schema/index.ts`.

- [ ] **Step 2: Apply locally**

Run: `bun run db:push` (or `bun run db:migrate` if that is the repo path for committed SQL)

Expected: table exists

- [ ] **Step 3: `bun run check:golden` after inventory row**

Add `packages/db/src/schema/team-billing.ts` to `docs/golden-file-source-inventory.md` with the same role as other schema files.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/team-billing.ts packages/db/src/schema/index.ts packages/db/src/migrations/0072_workspace_team_billing.sql packages/db/src/migrations/meta/_journal.json docs/golden-file-source-inventory.md
git commit -m "$(cat <<'EOF'
feat(db): add workspace team billing snapshot

EOF
)"
```

---

### Task 3: `getTeamBilling` / `assertAgencyEntitled`

**Files:**
- Create: `packages/api/src/billing-team.ts`
- Create: `packages/api/src/billing-team.test.ts`

**Interfaces:**
- Consumes: `workspaceTeamBilling`, `resolvePlanAt`, `user.lifetimePro`
- Produces: `getTeamBilling`, `assertAgencyEntitled`, `insertTrialBilling`

- [ ] **Step 1: Write the failing integration test**

Follow `packages/api/src/routers/team/service.integration.test.ts` fixture users. File: `packages/api/src/billing-team.test.ts`

```ts
import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [{ db }, { user }, teamService, billingTeam] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema/auth"),
  import("./routers/team/service"),
  import("./billing-team"),
]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `integration-billing-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Billing Integration User",
    email: `${id}@example.test`,
  });
  fixtureUsers.push(id);
  return id;
}

describe("team billing snapshot", () => {
  test("createTeam starts a trial that enables Agency", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Trial Agency" });
    const now = new Date("2026-09-17T00:00:00.000Z");
    const snapshot = await billingTeam.getTeamBilling(team.id, now);
    expect(snapshot.plan).toBe("trial");
    expect(snapshot.seats).toBe(1);
    await expect(billingTeam.assertAgencyEntitled(team.id, now)).resolves.toMatchObject({
      plan: "trial",
    });
  });

  test("after trial ends Agency is forbidden with trial_ended", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Expired Agency" });
    const snapshot = await billingTeam.getTeamBilling(team.id, new Date("2026-09-17T00:00:00.000Z"));
    const after = new Date(new Date(snapshot.trialEndsAt).getTime() + 1000);
    await expect(billingTeam.assertAgencyEntitled(team.id, after)).rejects.toMatchObject({
      code: "FORBIDDEN",
      data: { code: "trial_ended" },
    });
  });

  test("a member inherits the team snapshot without lifetimePro", async () => {
    const ownerId = await createFixtureUser();
    const memberId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Shared Agency" });
    await teamService.addTeamMember(ownerId, {
      teamId: team.id,
      userEmail: `${memberId}@example.test`,
      role: "viewer",
    });
    await billingTeam.applyPaidPlan(team.id, "agency", { seats: 1 });
    const now = new Date("2026-12-01T00:00:00.000Z");
    await expect(billingTeam.assertAgencyEntitled(team.id, now)).resolves.toMatchObject({
      plan: "agency",
    });
    expect((await db.select().from(user).where(eq(user.id, memberId)))[0]?.lifetimePro).toBe(false);
  });
});
```

`applyPaidPlan` is a test/helper used later by Polar webhooks; implement it in `billing-team.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/api/src/billing-team.test.ts`

Expected: FAIL (`createTeam` has no billing row / module missing)

- [ ] **Step 3: Implement `billing-team.ts` and wire `createTeam`**

`insertTrialBilling` inside the same transaction as `createTeam` in `packages/api/src/routers/team/service.ts`:

```ts
trialEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
plan: "trial",
seats: 1,
```

`assertAgencyEntitled`:

```ts
import { ORPCError } from "@orpc/server";
import { agencyEnabled, resolvePlanAt } from "@orch/workspace/tiers";

export async function assertAgencyEntitled(teamId: string, now = new Date()) {
  const snapshot = await getTeamBilling(teamId, now);
  if (!agencyEnabled(snapshot.plan)) {
    throw new ORPCError("FORBIDDEN", {
      message:
        snapshot.plan === "leftover"
          ? "Trial ended. Subscribe to keep Tracker, projects, money, and people for this agency."
          : "This agency is not subscribed.",
      data: { code: snapshot.plan === "leftover" ? "trial_ended" : "not_entitled", plan: snapshot.plan },
    });
  }
  return snapshot;
}
```

Missing billing row: `not_entitled` (do not auto-heal except in `ensurePersonalAgency`).

- [ ] **Step 4: Run tests**

Run: `bun test packages/api/src/billing-team.test.ts packages/api/src/routers/team/service.integration.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/billing-team.ts packages/api/src/billing-team.test.ts packages/api/src/routers/team/service.ts
git commit -m "$(cat <<'EOF'
feat(api): persist trial billing on team create

EOF
)"
```

---

### Task 4: Auto Agency on signup

**Files:**
- Create: `packages/api/src/routers/team/ensure-personal-agency.ts`
- Create: `packages/api/src/routers/team/ensure-personal-agency.test.ts`
- Modify: `packages/auth/src/index.ts`

**Interfaces:**
- Consumes: `createTeam` / `listUserTeams`
- Produces: `ensurePersonalAgency(actorUserId, { name })`

- [ ] **Step 1: Failing test**

```ts
test("creates one agency when the user has none", async () => {
  const userId = await createFixtureUser();
  const first = await ensurePersonalAgency(userId, { name: "Ada" });
  const second = await ensurePersonalAgency(userId, { name: "Ada" });
  expect(first.id).toBe(second.id);
  expect(first.name).toBe("Ada's agency");
});
```

Name rule: trim; if it already ends with `agency` (case-insensitive), use as-is; else `` `${name}'s agency` ``. Empty name → `Agency`.

- [ ] **Step 2: Run — expect FAIL**

Run: `bun test packages/api/src/routers/team/ensure-personal-agency.test.ts`

- [ ] **Step 3: Implement and call from `schedulePolarCustomerSetup`’s user create hook after Polar schedule**

Keep Polar setup fire-and-forget. Agency create must **await** in the hook (Better Auth `after` can be async). If create fails, log and rethrow so signup is not a user without a team.

Also call `ensurePersonalAgency` from authenticated boot if `team.list` is empty (covers users created before this slice). Service: `ensurePersonalAgency` is idempotent.

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(auth): auto-create a personal Agency on signup

EOF
)"
```

---

### Task 5: Entitlement in Agency services; drop user Pro middleware

**Files:**
- Modify: every `packages/api/src/routers/agency-ops/**/router.ts` that imports `protectedProProcedure` → `protectedProcedure`
- Modify: corresponding `service.ts` files: after `requireTeamMembership`, `await assertAgencyEntitled(input.teamId)`
- Modify: `packages/api/src/procedures.ts` — keep `protectedProProcedure` only if something still needs user Polar; if unused, delete it
- Modify: `packages/api/src/routers/workspace/router.ts` marketplace.save — still paid-only in slice 3; for this slice use `assertAgencyEntitled` plus `snapshot.limits.marketplacePublish` (will fail on trial; that matches spec)
- Modify: timer paths that have no `teamId`: load timer, then `assertAgencyEntitled(timer.teamId)`

**Interfaces:**
- Consumes: `assertAgencyEntitled`
- Produces: teammates on a trial/paid team can call Agency RPCs

Helper (not a pass-through):

```ts
export async function requireAgencyRole(
  actorUserId: string,
  teamId: string,
  requiredRole: WorkspaceTeamRole,
  now?: Date,
) {
  const role = await requireTeamMembership(actorUserId, teamId, requiredRole);
  await assertAgencyEntitled(teamId, now);
  return role;
}
```

Replace duplicated membership+entitlement with this where both are required. Do not change owner vs editor in this slice.

- [ ] **Step 1: Add test in `billing-team.test.ts`**

Call a real Agency read, e.g. `listAgencyClients` (or tags list) as the **member** on a trial team. Expect success. As leftover clock, expect `trial_ended`.

Import the clients or tags service the same way integration tests already do.

- [ ] **Step 2: Run — FAIL until routers/services updated**

- [ ] **Step 3: Replace procedures and add `requireAgencyRole` in `packages/api/src/lib/team-membership.ts` or `billing-team.ts`**

Do not leave any `agencyOps` router on `protectedProProcedure`.

- [ ] **Step 4: `bun test` the new test + a representative agency-ops integration file**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(api): gate Agency on the team billing snapshot

EOF
)"
```

---

### Task 6: Notifications are auth, not Polar Pro

**Files:**
- Modify: `packages/api/src/routers/notifications/router.ts` — `protectedProcedure` instead of `protectedProProcedure`
- Modify: existing `packages/api/src/routers/notifications/service.integration.test.ts` if it assumed Pro

- [ ] **Step 1: Test leftover user (`lifetimePro: false`, team plan leftover) can `listNotifications`**

- [ ] **Step 2: FAIL if router still Pro**

- [ ] **Step 3: Swap procedure; services still `requireTeamMembership` for team-scoped lists**

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(api): stop requiring Polar Pro for notifications

EOF
)"
```

---

### Task 7: `billing.state` is team-scoped

**Files:**
- Modify: `packages/api/src/routers/billing/schemas.ts`
- Modify: `packages/api/src/routers/billing/router.ts`
- Modify: `packages/api/src/routers/billing/service.ts`
- Modify: `apps/web/src/features/billing/billing-queries.ts`
- Modify: `apps/web/src/lib/authenticated-boot.ts`
- Test: `packages/api/src/routers/billing/service.test.ts` (create)

**Interfaces:**
- Consumes: `getTeamBilling`
- Produces: `{ plan, agencyEnabled, limits, seats, trialEndsAt, subscription }`

- [ ] **Step 1: Failing test** — `getSubscriptionBillingState(userId, { teamId })` returns `plan: "trial"` for a new team; outsider `UNAUTHORIZED`

- [ ] **Step 2: Change input to `{ teamId: z.string().min(1) }`, require membership, return snapshot. Map `limits` from `AGENCY_PLAN_LIMITS[plan]` plus `agencyOps: agencyEnabled(plan)` so the web boot gate still compiles.**

- [ ] **Step 3: Web `useBilling(teamId)` uses `orpc.billing.state.queryOptions({ input: { teamId } })`. Boot prefetch waits until `resolveBootTeamId` then prefetches that team. No team → skip Agency prefetch.**

- [ ] **Step 4: `bun run check-types`**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(billing): resolve entitlements for the current Agency

EOF
)"
```

---

### Task 8: Paywall copy (trial ended)

**Files:**
- Modify: `apps/web/src/features/billing/agency-pro-upsell.tsx` (rename file to `agency-paywall-view.tsx` if check-conventions requires view suffix; keep a barrel re-export)
- Modify: `apps/web/src/pages/agency-page.tsx` — `agencyEnabled` from `plan` / `agencyEnabled`
- Modify: `apps/web/src/pages/billing-success-page.tsx` — copy from spec
- Test: optional view-model helper `agencyPaywallCopy(plan)` in `apps/web/src/features/billing/agency-paywall-copy.ts` + `.test.ts`

**Interfaces:**
- Produces: locked strings from the spec

- [ ] **Step 1: Unit test copy**

```ts
import { describe, expect, test } from "bun:test";
import { agencyPaywallCopy } from "./agency-paywall-copy";

test("trial ended copy", () => {
  const copy = agencyPaywallCopy("leftover");
  expect(copy.title).toBe("Trial ended");
  expect(copy.body).toBe(
    "Subscribe to keep Tracker, projects, money, and people for this agency. Canvas stays available on the leftover limits.",
  );
  expect(copy.primary).toBe("Subscribe — 1 seat");
  expect(copy.secondary).toBe("Open Canvas");
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement view; primary still `checkout("pro")` until slice 5 adds slug `agency` (document in the view as the existing Polar slug). Do not invent a second Polar product in this slice.**

- [ ] **Step 4: PASS + `bun run check`**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(web): replace Pro upsell with trial-ended paywall

EOF
)"
```

---

### Task 9: Lifetime Pro → Unlimited 1 seat on owned Agency

**Files:**
- Modify: `packages/api/src/billing-team.ts`
- Modify: `packages/api/src/billing-team.test.ts`
- Modify: `apps/server/src/operations/maintenance/grant-lifetime-pro.ts` (optional note)

- [ ] **Step 1: Test** — user with `lifetimePro: true`, `ensurePersonalAgency`, `getTeamBilling` → `plan: "agency_unlimited"`, `seats: 1`. A second member still allowed in this slice (seat cap is slice 3). Document that seats are not enforced yet.

- [ ] **Step 2: On `getTeamBilling`, if stored plan is trial/leftover and the team `createdByUserId` has `lifetimePro`, treat as `agency_unlimited` without waiting for Polar. Do not set leftover.**

- [ ] **Step 3: PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(billing): map lifetime Pro to Agency Unlimited for the owned team

EOF
)"
```

---

### Task 10: Slice 1 verification

- [ ] **Step 1:** `bun run check`
- [ ] **Step 2:** `bun run check-types`
- [ ] **Step 3:** `bun run check:conventions`
- [ ] **Step 4:** `bun run check:golden`
- [ ] **Step 5:** Manual: sign up (or empty team list) → `{name}'s agency` exists; `/agency` works during trial; set `trial_ends_at` in the past → paywall; second user added as member still opens Tracker; leftover user opens `/canvas` and notifications do not 403.

---

## Later slices (do not implement here)

- Slice 2: `assertWithinLimit` for clients/projects/tasks/nodes/blocks; upload 403 on trial/leftover
- Slice 3: Polar quantity = seats; invite checkout; Orch included + packs; delete `any active subscription = Pro` fallback
- Slice 4: editor client record / projects / tasks; viewer live timer; `FORBIDDEN` for roles; money scoreboard owner
- Slice 5: Polar slugs `agency` / `agency-unlimited`; landing table; drop Pro copy

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Team snapshot | 2–3 |
| Auto Agency | 4 |
| Trial clock / leftover | 1, 3 |
| Member inherits | 3, 5 |
| Drop user Pro on Agency | 5 |
| Notifications leftover-safe | 6 |
| billing.state teamId | 7 |
| Paywall copy | 8 |
| Lifetime grandfather | 9 |
| Volume caps, seats, Orch packs, editor RBAC, landing | later slices (named) |
