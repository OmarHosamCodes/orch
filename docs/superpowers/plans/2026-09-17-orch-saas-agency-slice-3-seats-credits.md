# Orch SaaS Agency Slice 3 — Seats and Orch credits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bill seats as Polar quantity, block invites that exceed billed seats (trial is solo), meter Orch messages (included × seats, then packs), and stop treating any Polar subscription as Agency/Pro.

**Architecture:** `workspace_team_billing` stays the read model. `applyPolarSnapshot` writes plan + seats + Polar ids from a Polar-free view (no SDK types past that function). `assertWithinLimit(..., "members" | "orchMessages")` extends Slice 2. Seat checkout uses Polar SDK `checkouts.create` with `seats` (Better Auth slug `"pro"` stays 1-seat paywall until Slice 5). Credit packs increment `orchCreditsRemaining` idempotently on Polar `checkout_id`.

**Tech Stack:** Bun, Drizzle/Postgres, Polar SDK + existing Better Auth Polar plugin, oRPC, golden-file services.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-17-orch-saas-agency-design.md`
- Slice 1–2 already shipped team snapshot, trial clock, volume caps, upload block. Do not rework editor RBAC or landing catalog (Slices 4–5)
- Golden file: schema → service `(actorUserId, input)` → router `.parse()` → hook → container → view
- Views do not import oRPC, Polar SDK, Drizzle, or `getBillingStateForUser`
- Copy: never say “Pro”
- `FORBIDDEN` `data.code` this slice: `seat_required`, `orch_credits` (keep `trial_ended`, `not_entitled`, `limit_reached`, `upload_blocked`)
- Locked seat copy: `Every member needs a seat. Add a seat to invite them.`
- Locked trial-invite dialog: Title `Add a seat`; Body `Trial is solo. Adding someone starts Agency billing for this team.`; Primary `Continue to checkout`; Secondary `Cancel`
- Locked Orch copy: `This agency has used its included Orch messages. Buy credits to continue.`
- Seat count = active `workspace_team_member` rows including the owner. Role does not change price
- Trial is solo (`seats: 1`). Invite during trial does **not** insert a member; it is checkout for seat 2
- Lifetime Pro → Agency Unlimited; extra members still need billed seats. If Polar snapshot has `seats > 1`, use that seat count; otherwise seats stay 1
- Paid included Orch = `AGENCY_PLAN_LIMITS[plan].orchMessagesIncluded * seats` (Slice 1 1-seat floor ends here). Trial/leftover stay 5 lifetime
- Orch is never unlimited. After included is used, consume `orchCreditsRemaining`. If both exhausted → `orch_credits`
- Credit pack: idempotent on Polar `checkout_id`. Packs must **not** grant Agency
- Delete `any active subscription = Pro` in `normalizeBillingState`. Only `POLAR_PRODUCT_PRO` (comma-separated) maps to Polar Pro/Agency overlay
- Checkout slug `"pro"` remains for the 1-seat paywall until Slice 5. Seat quantity uses Polar SDK `seats`, not a new slug
- Polar customer remains the billing owner user (`externalCustomerId` = owner user id). Metadata `teamId`
- Inject `now` into billing reads. Bun only. Conventional commits on `from-brainiac-to-orch`
- Pre-existing `bun run check` view-hook failures are out of scope
- Do not implement Polar slugs `agency` / `agency-unlimited`, landing rewrite, or editor project-create

## File map

- Modify: `packages/api/src/billing.ts` — drop any-active fallback
- Modify: `packages/api/src/billing.test.ts`
- Modify: `packages/api/src/billing-team.ts` — `applyPolarSnapshot`, `consumeOrchMessage`, `members` / `orchMessages` counters, included × seats, lifetime seats
- Modify: `packages/api/src/billing-team.test.ts`
- Modify: `packages/api/src/routers/team/service.ts` — `addTeamMember` seat gate
- Modify: `packages/api/src/routers/team/service.integration.test.ts` — trial invite no longer inserts
- Modify: `packages/api/src/routers/agent/service.ts` — consume Orch on each turn
- Modify: `packages/api/src/routers/agent/router.ts` — do not swallow `orch_credits` as 500
- Modify: `packages/api/src/routers/billing/service.ts` + `router.ts` + `schemas.ts` — seat/credit checkout URLs; `confirmCheckout`
- Create: `packages/db/src/schema/team-billing-credits.ts` — `workspaceTeamBillingCreditGrant`
- Create: `packages/db/src/migrations/0073_team_billing_credit_grants.sql`
- Modify: `packages/db/src/schema/index.ts`, `packages/db/src/migrations/meta/_journal.json` (idx 71)
- Modify: `packages/db/src/schema/team-billing.ts` — `orchMessagesPeriodStart`
- Modify: `packages/auth/src/index.ts` — webhook `onOrderPaid` / `onSubscriptionActive` call a **registrar** (do not import `@orch/api` / `billing-team` from auth — Slice 1 circular-dep rule)
- Create: `packages/auth/src/polar-billing-after.ts` — registrar like `user-create-after.ts`
- Modify: `apps/server/src/app.ts` (and `apps/server/src/operations/seeds/seed.ts` if it also registers Agency) — register Polar billing callbacks next to `registerPersonalAgencyOnUserCreate`
- Modify: `packages/env/src/server.ts` + `.env.example` — optional `POLAR_PRODUCT_ORCH_CREDITS`
- Modify: `apps/web/src/features/billing/billing-queries.ts` — `checkoutSeats`, `checkoutCredits`
- Modify: `apps/web/src/features/billing/agency-paywall-copy.ts` — seat dialog copy helper
- Modify: `apps/web/src/features/team/team-store.ts` — on `seat_required` open checkout, do not keep optimistic member
- Modify: `apps/web/src/pages/billing-success-page.tsx` — `confirmCheckout({ checkoutId })`
- Modify: `docs/golden-file-source-inventory.md` if new in-scope files

Polar SDK checkout (locked):

```ts
await polar.checkouts.create({
  products: [env.POLAR_PRODUCT_PRO],
  seats: quantity, // Polar seat-based pricing
  metadata: { teamId },
  customFieldData: { "team-id": teamId },
  externalCustomerId: actorUserId,
  successUrl: `${origin}/billing/success?checkout_id={CHECKOUT_ID}`,
});
```

`PolarSubscriptionView` (no Polar SDK types):

```ts
export type PolarSubscriptionView = {
  teamId: string;
  subscriptionId: string;
  productId: string;
  seats: number;
  status: "active" | "canceled" | "revoked";
};
```

---

### Task 1: Stop treating any Polar subscription as Pro

**Files:**
- Modify: `packages/api/src/billing.ts`
- Modify: `packages/api/src/billing.test.ts`

**Interfaces:**
- Consumes: `env.POLAR_PRODUCT_PRO` comma-separated ids
- Produces: `normalizeBillingState` returns Polar Pro only when `productId` is in that list. A credit-pack-only (or unknown) active subscription is **free** unless `lifetimePro`

- [ ] **Step 1: Failing test** — change the existing `"prefers an active Polar subscription over the lifetime override"` case that uses `"polar-paid"`:

```ts
test("an unknown Polar product does not grant Pro", () => {
  const result = normalizeBillingState(createCustomerState("polar-credits"), {
    lifetimePro: false,
  });
  expect(result.tier).toBe("free");
  expect(result.subscription).toBeNull();
});

test("lifetime still applies when the only Polar product is not Pro", () => {
  const result = normalizeBillingState(createCustomerState("polar-credits"), {
    lifetimePro: true,
  });
  expect(result.tier).toBe("pro");
  expect(result.subscription?.source).toBe("lifetime");
});
```

Keep the configured-id test (`createCustomerState()` default `"polar-pro"`) green. Set `Bun.env.POLAR_PRODUCT_PRO = "polar-pro"` in the test file if needed.

- [ ] **Step 2: FAIL** — `bun test packages/api/src/billing.test.ts` (unknown product currently becomes Pro via the fallback)

- [ ] **Step 3: Delete the fallback**

Remove:

```ts
  // Fallback: any active subscription counts as Pro
  const anyActive = customerState.activeSubscriptions[0];
  if (anyActive) {
    return getPolarProBillingState(anyActive);
  }
```

If no configured Pro match, `return fallbackBilling`.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(billing): do not treat credit-pack Polar subs as Agency

EOF
)"
```

---

### Task 2: `applyPolarSnapshot` and included Orch × seats

**Files:**
- Modify: `packages/api/src/billing-team.ts`
- Modify: `packages/api/src/billing-team.test.ts`
- Modify: `packages/db/src/schema/team-billing.ts` — add `orchMessagesPeriodStart` timestamp notNull default now()
- Create: `packages/db/src/migrations/0073_team_billing_credit_grants.sql` (period column in this file; credit grant table can land here too if Task 5 uses the same migration — **create the SQL file in this task with BOTH the period column AND an empty-ready credit grant table** so later tasks do not fight migrations)

SQL:

```sql
ALTER TABLE "workspace_team_billing"
  ADD COLUMN "orch_messages_period_start" timestamp DEFAULT now() NOT NULL;

CREATE TABLE "workspace_team_billing_credit_grant" (
  "checkout_id" text PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL REFERENCES "workspace_team" ("id") ON DELETE cascade,
  "credits" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

Journal: copy the 0072 entry, `idx: 71`, `tag: "0073_team_billing_credit_grants"`, `when: 1787900000048`.

**Interfaces:**

```ts
export type PolarSubscriptionView = {
  teamId: string;
  subscriptionId: string;
  productId: string;
  seats: number;
  status: "active" | "canceled" | "revoked";
};

export async function applyPolarSnapshot(teamId: string, polar: PolarSubscriptionView): Promise<void>;
```

Mapping: if `polar.productId` is in `POLAR_PRODUCT_PRO` and `status === "active"`, `applyPaidPlan(teamId, "agency", { seats: max(1, polar.seats) })` and persist `polarSubscriptionId` / `polarProductId`. If `canceled` | `revoked`, do **not** delete data; leave plan as stored (trial clock / leftover still via `resolvePlanAt`). Do not map unknown product ids (credit packs).

`mapTeamBillingSnapshot`:

```ts
const floor = AGENCY_PLAN_LIMITS[plan].orchMessagesIncluded;
const included =
  AGENCY_PLAN_LIMITS[plan].orchMessagesPeriod === "month"
    ? floor * seats
    : floor;
```

Lifetime overlay: plan `agency_unlimited`; `seats = billing.polarSubscriptionId ? billing.seats : 1` (not hardcoded 1 when Polar seats exist).

Monthly window: if period is `month` and `now` is after the UTC month of `orchMessagesPeriodStart`, set `orchMessagesUsed = 0` and `orchMessagesPeriodStart = startOfUtcMonth(now)` inside `getTeamBilling` / snapshot resolve (same executor as other billing writes when `tx` is passed).

- [ ] **Step 1: Tests**

```ts
test("applyPolarSnapshot writes agency seats from Polar quantity", async () => {
  const ownerId = await createFixtureUser();
  const team = await teamService.createTeam(ownerId, { name: "Seats Agency" });
  await billingTeam.applyPolarSnapshot(team.id, {
    teamId: team.id,
    subscriptionId: "sub_1",
    productId: process.env.POLAR_PRODUCT_PRO ?? "polar-pro",
    seats: 3,
    status: "active",
  });
  await expect(billingTeam.getTeamBilling(team.id)).resolves.toMatchObject({
    plan: "agency",
    seats: 3,
    orchMessagesIncluded: 150,
  });
});

test("lifetime Unlimited uses Polar seats when a subscription exists", async () => {
  const ownerId = await createFixtureUser({ lifetimePro: true });
  const team = await ensurePersonalAgencyModule.ensurePersonalAgency(ownerId, { name: "Life" });
  await billingTeam.applyPolarSnapshot(team.id, {
    teamId: team.id,
    subscriptionId: "sub_life",
    productId: process.env.POLAR_PRODUCT_PRO ?? "polar-pro",
    seats: 2,
    status: "active",
  });
  await expect(billingTeam.getTeamBilling(team.id)).resolves.toMatchObject({
    plan: "agency_unlimited",
    seats: 2,
    orchMessagesIncluded: 400,
  });
});
```

Tests that still expect lifetime `seats: 1` without Polar remain valid.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement** — persist polar ids in `applyPaidPlan` or a dedicated update in `applyPolarSnapshot`. Extend `applyPaidPlan` input with optional `polarSubscriptionId` / `polarProductId`.

- [ ] **Step 4: PASS** — `bun test packages/api/src/billing-team.test.ts`

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(billing): apply Polar seat quantity onto the team snapshot

EOF
)"
```

---

### Task 3: Seat cap on invite

**Files:**
- Modify: `packages/api/src/billing-team.ts` — add `"members"` to `VolumeCounter`; count `workspace_team_member`; fail with `seat_required` (not `limit_reached`)
- Modify: `packages/api/src/routers/team/service.ts` — `addTeamMember`
- Modify: `packages/api/src/billing-team.test.ts`
- Modify: existing tests that add a second member on a **trial** team (at least `billing-team.test.ts` trial-member inherit test, `team/service.integration.test.ts` if it invites on trial). Those must `applyPaidPlan`/`applyPolarSnapshot` with `seats: 2` **or** expect `seat_required`.

**Interfaces:**
- `assertWithinLimit(teamId, "members", { tx?, adding?: 1 })`
- On fail throw:

```ts
new ORPCError("FORBIDDEN", {
  message: "Every member needs a seat. Add a seat to invite them.",
  data: { code: "seat_required", seats: snapshot.seats },
});
```

Do **not** use the generic `limit_reached` sentence for members.

`addTeamMember`: after owner membership, open `db.transaction`, `assertWithinLimit(teamId, "members", { tx })`, then insert. Existing member `onConflictDoUpdate` (same user already on the team) must **not** consume a new seat (re-find membership in tx first; if exists, update role only).

- [ ] **Step 1: Tests**

```ts
test("trial invite does not insert a second member", async () => {
  const ownerId = await createFixtureUser();
  const memberId = await createFixtureUser();
  const team = await teamService.createTeam(ownerId, { name: "Solo" });
  await expect(
    teamService.addTeamMember(ownerId, {
      teamId: team.id,
      userEmail: `${memberId}@example.test`,
      role: "viewer",
    }),
  ).rejects.toMatchObject({
    data: { code: "seat_required" },
    message: "Every member needs a seat. Add a seat to invite them.",
  });
  const members = await db
    .select()
    .from(workspaceTeamMember)
    .where(eq(workspaceTeamMember.teamId, team.id));
  expect(members).toHaveLength(1);
});

test("paid seats=2 allows a second member", async () => {
  const ownerId = await createFixtureUser();
  const memberId = await createFixtureUser();
  const team = await teamService.createTeam(ownerId, { name: "Paid" });
  await billingTeam.applyPaidPlan(team.id, "agency", { seats: 2 });
  await expect(
    teamService.addTeamMember(ownerId, {
      teamId: team.id,
      userEmail: `${memberId}@example.test`,
      role: "viewer",
    }),
  ).resolves.toMatchObject({ userId: memberId });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: PASS** including previously green Slice 1 tests after fixture updates

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(team): require a billed seat before adding a member

EOF
)"
```

---

### Task 4: Consume Orch messages then credits

**Files:**
- Modify: `packages/api/src/billing-team.ts` — `consumeOrchMessage`, `assertWithinLimit(..., "orchMessages")`
- Modify: `packages/api/src/billing-team.test.ts`
- Modify: `packages/api/src/routers/agent/service.ts` — call consume on **every** turn (new and existing conversations), resolving the actor’s owned Agency team (same rule as canvas: `createdByUserId` then first membership)
- Modify: `packages/api/src/routers/agent/router.ts` — `orch_credits` / `FORBIDDEN` from consume must not be wrapped as `INTERNAL_SERVER_ERROR` (rethrow ORPCError with those codes)

**Interfaces:**

```ts
export async function consumeOrchMessage(teamId: string, now?: Date, tx?: VolumeCapDbExecutor): Promise<void>;
```

Logic (lock billing row FOR UPDATE):

1. Resolve snapshot (monthly reset already in Task 2)
2. If `orchMessagesUsed < orchMessagesIncluded` → increment `orchMessagesUsed` by 1
3. Else if `orchCreditsRemaining > 0` → decrement credits by 1
4. Else throw

```ts
new ORPCError("FORBIDDEN", {
  message: "This agency has used its included Orch messages. Buy credits to continue.",
  data: { code: "orch_credits" },
});
```

Trial: 5 included lifetime. 6th consume without credits fails. Paid agency 1 seat: 50 included.

If the actor has no Agency team, skip consume (no silent Polar user cap). Do not use `getBillingStateForUser` for this gate.

Replace `assertCanCreateDashboardConversation` Polar conversation-count gate **or** leave it unused: do not double-charge. Prefer consume-per-turn only; stop using user Polar `aiConversations` for Orch.

- [ ] **Step 1: Tests** in `billing-team.test.ts` for consume 5 then 6th `orch_credits`; paid 50; credit remaining used after included.

Agent turn test only if a focused unit can call consume without OpenRouter. Do not add live model tests.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(agent): meter Orch messages against the team snapshot

EOF
)"
```

---

### Task 5: Credit packs (idempotent checkout_id)

**Files:**
- Modify: `packages/db/src/schema/team-billing-credits.ts` (if not created in Task 2)
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/api/src/billing-team.ts` — `applyCreditPack`
- Modify: `packages/api/src/billing-team.test.ts`
- Create: `packages/auth/src/polar-billing-after.ts` — `registerPolarOrderPaid` / `registerPolarSubscriptionActive` (auth must not import `billing-team`)
- Modify: `packages/auth/src/index.ts` — `webhooks({ onOrderPaid, onSubscriptionActive })` call the registrar
- Modify: the existing API boot that already calls `registerPersonalAgencyOnUserCreate` — register `applyPolarSnapshot` / `applyCreditPack` adapters there
- Modify: `packages/env/src/server.ts` — `POLAR_PRODUCT_ORCH_CREDITS: z.string().optional()`
- Modify: `.env.example` if present

**Interfaces:**

```ts
export async function applyCreditPack(
  teamId: string,
  input: { checkoutId: string; credits: number },
): Promise<{ applied: boolean }>;
```

Insert grant `onConflictDoNothing` on `checkout_id`. If insert returned a row, `orchCreditsRemaining += credits`. Second call with same `checkoutId` returns `{ applied: false }` and does not increment.

Pack size locked: **100** credits per paid pack order (catalog). `credits: 100` in the webhook mapper.

`onOrderPaid`: if product id === `POLAR_PRODUCT_ORCH_CREDITS`, `applyCreditPack(metadata.teamId, { checkoutId, credits: 100 })`. If product id is in `POLAR_PRODUCT_PRO`, `applyPolarSnapshot` with seats from the order/subscription (default 1). Ignore other products.

Webhook handlers must be thin: map payload → Polar-free view → registrar callback. Polar SDK types stay in `packages/auth`. **Do not** `import` `@orch/api` from `@orch/auth`.

- [ ] **Step 1: Tests** for apply twice / remaining 200 vs 100

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(billing): apply Orch credit packs once per Polar checkout

EOF
)"
```

---

### Task 6: Seat and credit checkout URLs + web copy

**Files:**
- Modify: `packages/api/src/routers/billing/schemas.ts` + `service.ts` + `router.ts`
- Modify: `apps/web/src/features/billing/billing-queries.ts`
- Modify: `apps/web/src/features/billing/agency-paywall-copy.ts` + `agency-paywall-copy.test.ts`
- Modify: `apps/web/src/features/team/team-store.ts`
- Modify: `apps/web/src/pages/billing-success-page.tsx`
- Test: `packages/api/src/routers/billing/service.test.ts` (mock Polar client)

**Interfaces:**

```ts
export async function createSeatCheckout(
  actorUserId: string,
  input: { teamId: string; seats: number },
): Promise<{ url: string }>;

export async function createCreditCheckout(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ url: string }>;

export async function confirmCheckout(
  actorUserId: string,
  input: { teamId: string; checkoutId: string },
): Promise<TeamBillingSnapshot>;
```

`createSeatCheckout`: owner only; `seats` integer ≥ 2 (invite) or ≥ 1 (paywall can keep client slug `"pro"`). Inject Polar via a small `createPolarCheckout(input)` helper in `packages/api/src/billing-polar-checkout.ts` so tests stub it.

`confirmCheckout`: owner/member; fetch Polar checkout by id (stub in tests); if paid subscription → `applyPolarSnapshot`; if credit order → `applyCreditPack`. Return `getTeamBilling`.

Paywall 1-seat path may keep `authClient.checkout({ slug: "pro" })`. Invite uses `createSeatCheckout` with `snapshot.seats + 1`.

Web seat copy:

```ts
export function agencySeatInviteCopy() {
  return {
    title: "Add a seat",
    body: "Trial is solo. Adding someone starts Agency billing for this team.",
    primary: "Continue to checkout",
    secondary: "Cancel",
  };
}
```

`team-store.addTeamMember`: on `seat_required`, roll back optimistic member (already in catch), toast the locked seat message, call `createSeatCheckout` / `checkoutSeats({ seats: current+1 })` if you can read seats from billing query — do not add a Polar import in the view. Container/hook may call billing. Views stay Polar-free.

`billing-success-page`: if `checkout_id` present, `orpcClient.billing.confirmCheckout({ teamId, checkoutId })` then refresh.

- [ ] **Step 1: Tests** — copy unit tests; billing service with stub Polar returning `{ url: "https://polar.test/c" }`; confirmCheckout stub applies snapshot seats 2

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: PASS** + `bun run check:golden` if new files

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(billing): start Polar seat and credit checkouts from the Agency team

EOF
)"
```

---

### Task 7: Slice 3 verification

- [ ] **Step 1:** `bun test packages/api/src/billing.test.ts packages/api/src/billing-team.test.ts packages/api/src/routers/team/service.integration.test.ts`
- [ ] **Step 2:** `bun run check-types`
- [ ] **Step 3:** `bun run check:conventions`
- [ ] **Step 4:** `bun run check:golden` (inventory new files)
- [ ] **Step 5:** `bun run check` — record pre-existing view failures only
- [ ] **Step 6:** Confirm: trial second member `seat_required` and not inserted; paid seats=2 insert; unknown Polar product free; consume 6th leftover Orch `orch_credits`; duplicate credit checkout_id does not double remaining

Commit inventory if needed:

```bash
git commit -m "$(cat <<'EOF'
chore: inventory Slice 3 seat and credit files

EOF
)"
```

---

## Later slices (do not implement here)

- Slice 4: editor client/project/task; viewer live timer; `insufficient_role`; money scoreboard owner
- Slice 5: Polar slugs `agency` / `agency-unlimited`; landing table; drop Pro copy

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Polar quantity = seats | 2, 6 |
| Invite during trial → checkout seat 2, no insert | 3, 6 |
| Seat 2 without quantity+1 fails | 3 |
| Lifetime extra members need seats | 2, 3 |
| orch included × seats; packs after included | 2, 4, 5 |
| Leftover message 6 without credits fails | 4 |
| Credit pack idempotent on checkout_id | 5 |
| Delete any-sub = Pro | 1 |
| Checkout success refreshes snapshot | 6 |
| Polar slugs / landing / editor RBAC | later |
