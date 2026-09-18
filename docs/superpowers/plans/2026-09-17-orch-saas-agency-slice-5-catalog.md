# Orch SaaS Agency Slice 5 — Catalog and Polar slugs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polar checkout uses slugs `agency` and `agency-unlimited`; snapshots distinguish Agency vs Agency Unlimited by product id; the landing table and in-app billing copy drop “Pro”.

**Architecture:** A pure Polar catalog helper in `@orch/env` maps env product ids to paid plans and Better Auth checkout slugs. `applyPolarSnapshot` writes `agency` or `agency_unlimited` from that map. Web checkout calls `authClient.checkout({ slug: "agency" | "agency-unlimited" })`. Landing is three columns (trial/leftover, Agency, Agency Unlimited) with locked headline copy. Polar SKUs already exist in the School of Marketing org — do not recreate them.

**Tech Stack:** Bun, Polar + Better Auth Polar plugin, oRPC, golden-file web hooks/views, marketing landing section.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-17-orch-saas-agency-design.md` (Catalog + Landing pricing + UX copy)
- Slices 1–4 already shipped team snapshot, caps, seats/credits, editor RBAC. Do not rework those gates
- Golden file: schema → service `(actorUserId, input)` → router `.parse()` → hook → container → view
- Views do not import oRPC, Polar SDK, Drizzle, stores, or `getBillingStateForUser`
- Copy: never say “Pro” in **billing** UI (landing, paywall, settings, rail). Sentence case. No exclamation marks
- Do **not** rename Orch model-preset Fast/Balanced/**Pro** (`use-workspace-agent-model-preset.ts`) — that is a model tier, not a Polar SKU
- Do **not** touch workspace pros/cons block copy (`workspace-pros-cons-block-editor.tsx`)
- Locked landing headline: `Free to try. Agency when the trial ends.`
- Locked paywall primary: `Subscribe — 1 seat`
- Checkout slugs (Better Auth Polar plugin, verbatim): `agency`, `agency-unlimited`
- Polar catalog (production School of Marketing, already live — confirm, do not recreate):
  - Agency `ee8722e7-7ea2-4040-a8d7-d32bdfcd03e9` metadata slug `agency`
  - Agency Unlimited `a72406dd-cd21-416e-a443-a395d01bf2e3` metadata slug `agency-unlimited`
  - Orch credits `db04a245-5b14-417d-a579-afc372f92e6b` metadata slug `orch-credits-100`
- `POLAR_PRODUCT_PRO` stays required as the **Agency fallback** so current Railway `.env` keeps working. `POLAR_PRODUCT_AGENCY` optional override. `POLAR_PRODUCT_AGENCY_UNLIMITED` optional until Railway is updated
- Agency product id = `POLAR_PRODUCT_AGENCY` trimmed, else first comma-separated `POLAR_PRODUCT_PRO` id
- Unlimited product id = `POLAR_PRODUCT_AGENCY_UNLIMITED` trimmed, or `null` if unset
- `applyPolarSnapshot`: active Agency id → `applyPaidPlan(..., "agency")`; active Unlimited id → `applyPaidPlan(..., "agency_unlimited")`; credit pack / unknown id → no-op; `canceled`/`revoked` still leave stored plan (Slice 3)
- Seat checkout product: if current snapshot plan is `agency_unlimited` and unlimited id is configured, use unlimited; otherwise Agency
- Paywall / leftover Subscribe uses slug `agency` (1 seat)
- Landing Unlimited CTA uses slug `agency-unlimited`
- Paid vs trial: `isPaidPlan = plan === "agency" || plan === "agency_unlimited"`. Do **not** use `isPro` / `legacyTier` for landing CTAs — trial is `agencyEnabled` and would look paid
- Inject `now` into billing reads. Bun only. Conventional commits on `from-brainiac-to-orch`
- Pre-existing `bun run check` view-hook failures are out of scope
- Do not invent Polar product ids. Do not add annual SKUs, Polar orgs, or a lifetime SKU

## File map

- Create: `packages/env/src/polar-catalog.ts` — `resolvePolarCatalog`, `planForPolarProductId`, `polarCheckoutProducts`
- Create: `packages/env/src/polar-catalog.test.ts`
- Modify: `packages/env/src/server.ts` — optional `POLAR_PRODUCT_AGENCY`, `POLAR_PRODUCT_AGENCY_UNLIMITED`; re-export catalog helpers
- Modify: `.env.example` (+ `apps/server/.env.example` if it duplicates Polar keys)
- Modify: `packages/api/src/billing-team.ts` — `applyPolarSnapshot` uses `planForPolarProductId`
- Modify: `packages/api/src/billing-team.test.ts` — unlimited snapshot test
- Modify: `packages/api/src/billing.ts` — Polar overlay matches Agency **or** Unlimited ids
- Modify: `packages/api/src/billing.test.ts`
- Modify: `packages/api/src/routers/billing/service.ts` — seat checkout product from catalog + current plan
- Modify: `packages/api/src/routers/billing/service.test.ts`
- Modify: `packages/auth/src/index.ts` — checkout products from `polarCheckoutProducts`
- Modify: `apps/web/src/features/billing/billing-queries.ts` — default slug `agency`
- Modify: `apps/web/src/features/billing/hooks/use-agency-paywall.ts` — `checkout("agency")`
- Modify: `apps/web/src/features/billing/containers/agency-paywall-container.tsx` — drop the Slice 5 comment
- Modify: `apps/web/src/components/marketing/landing-pricing.tsx`
- Create: `apps/web/src/components/marketing/landing-pricing-copy.ts` + `landing-pricing-copy.test.ts`
- Modify: `apps/web/src/features/app-shell/app-shell-rail.tsx`
- Modify: `apps/web/src/features/app-shell/app-shell-account-menu.tsx`
- Modify: `apps/web/src/features/user-settings/hooks/use-user-settings-modal-actions.ts`
- Modify: `apps/web/src/features/user-settings/views/user-settings-modal-view.tsx`
- Create: `apps/web/src/features/billing/agency-plan-label.ts` + test (shared display labels)
- Modify: `docs/golden-file-source-inventory.md` if new in-scope files

Polar catalog helper (locked):

```ts
export type PolarPaidPlan = "agency" | "agency_unlimited";

export type PolarCatalog = {
  agencyProductId: string;
  unlimitedProductId: string | null;
};

export function resolvePolarCatalog(input: {
  POLAR_PRODUCT_PRO: string;
  POLAR_PRODUCT_AGENCY?: string;
  POLAR_PRODUCT_AGENCY_UNLIMITED?: string;
}): PolarCatalog {
  const agencyProductId = (input.POLAR_PRODUCT_AGENCY ?? "").trim()
    || input.POLAR_PRODUCT_PRO.split(",")[0]!.trim();
  const unlimitedProductId = (input.POLAR_PRODUCT_AGENCY_UNLIMITED ?? "").trim() || null;
  return { agencyProductId, unlimitedProductId };
}

export function planForPolarProductId(
  catalog: PolarCatalog,
  productId: string,
): PolarPaidPlan | null {
  if (catalog.unlimitedProductId && productId === catalog.unlimitedProductId) {
    return "agency_unlimited";
  }
  if (productId === catalog.agencyProductId) {
    return "agency";
  }
  return null;
}

export function polarCheckoutProducts(
  catalog: PolarCatalog,
): Array<{ productId: string; slug: "agency" | "agency-unlimited" }> {
  const products: Array<{ productId: string; slug: "agency" | "agency-unlimited" }> = [
    { productId: catalog.agencyProductId, slug: "agency" },
  ];
  if (catalog.unlimitedProductId) {
    products.push({ productId: catalog.unlimitedProductId, slug: "agency-unlimited" });
  }
  return products;
}
```

Do not add a `slug: "pro"` product.

Plan labels (locked, billing UI only):

```ts
export function agencyPlanLabel(
  plan: "trial" | "leftover" | "agency" | "agency_unlimited" | undefined,
): string {
  switch (plan) {
    case "trial":
      return "Trial";
    case "leftover":
      return "Leftover";
    case "agency":
      return "Agency";
    case "agency_unlimited":
      return "Agency Unlimited";
    default:
      return "Leftover";
  }
}
```

---

### Task 1: Polar product ids map to Agency vs Unlimited

**Files:**
- Create: `packages/env/src/polar-catalog.ts`
- Create: `packages/env/src/polar-catalog.test.ts`
- Modify: `packages/env/src/server.ts`
- Modify: `.env.example`
- Modify: `packages/api/src/billing-team.ts`
- Modify: `packages/api/src/billing-team.test.ts`
- Modify: `packages/api/src/billing.ts`
- Modify: `packages/api/src/billing.test.ts`

**Interfaces:**
- Consumes: env Polar product strings
- Produces: `resolvePolarCatalog`, `planForPolarProductId`, `polarCheckoutProducts`; `applyPolarSnapshot` writes the matching paid plan

- [ ] **Step 1: Failing tests**

`packages/env/src/polar-catalog.test.ts`:

```ts
import { expect, test } from "bun:test";

import {
  planForPolarProductId,
  polarCheckoutProducts,
  resolvePolarCatalog,
} from "./polar-catalog";

test("Agency env overrides POLAR_PRODUCT_PRO fallback", () => {
  const catalog = resolvePolarCatalog({
    POLAR_PRODUCT_PRO: "legacy-pro,other",
    POLAR_PRODUCT_AGENCY: "agency-id",
    POLAR_PRODUCT_AGENCY_UNLIMITED: "unlimited-id",
  });
  expect(catalog).toEqual({
    agencyProductId: "agency-id",
    unlimitedProductId: "unlimited-id",
  });
  expect(planForPolarProductId(catalog, "agency-id")).toBe("agency");
  expect(planForPolarProductId(catalog, "unlimited-id")).toBe("agency_unlimited");
  expect(planForPolarProductId(catalog, "polar-credits")).toBeNull();
  expect(polarCheckoutProducts(catalog)).toEqual([
    { productId: "agency-id", slug: "agency" },
    { productId: "unlimited-id", slug: "agency-unlimited" },
  ]);
});

test("without Agency override, first POLAR_PRODUCT_PRO id is Agency", () => {
  const catalog = resolvePolarCatalog({ POLAR_PRODUCT_PRO: "polar-pro,ignored" });
  expect(catalog.agencyProductId).toBe("polar-pro");
  expect(catalog.unlimitedProductId).toBeNull();
  expect(polarCheckoutProducts(catalog)).toEqual([
    { productId: "polar-pro", slug: "agency" },
  ]);
});
```

`packages/api/src/billing-team.test.ts` — add:

```ts
test("applyPolarSnapshot writes agency_unlimited for the Unlimited product", async () => {
  const previousUnlimited = Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED;
  Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = "polar-unlimited";
  const ownerId = await createFixtureUser();
  const team = await teamService.createTeam(ownerId, { name: "Unlimited Agency" });
  await billingTeam.applyPolarSnapshot(team.id, {
    teamId: team.id,
    subscriptionId: "sub_unl",
    productId: "polar-unlimited",
    seats: 2,
    status: "active",
  });
  await expect(billingTeam.getTeamBilling(team.id)).resolves.toMatchObject({
    plan: "agency_unlimited",
    seats: 2,
    orchMessagesIncluded: 400,
  });
  if (previousUnlimited === undefined) {
    delete Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED;
  } else {
    Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = previousUnlimited;
  }
});
```

`packages/api/src/billing.test.ts` — add:

```ts
test("Unlimited Polar product still maps to the polar-backed overlay", () => {
  const previous = Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED;
  Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = "polar-unlimited";
  const result = normalizeBillingState(createCustomerState("polar-unlimited"));
  expect(result.tier).toBe("pro");
  expect(result.subscription?.productId).toBe("polar-unlimited");
  if (previous === undefined) {
    delete Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED;
  } else {
    Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = previous;
  }
});
```

Env module may cache `process.env` at import. If the Unlimited overlay test cannot see a runtime env change, set `Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = "polar-unlimited"` **at the top of `billing.test.ts`** (same pattern as `POLAR_PRODUCT_PRO`) and drop the mutate/restore.

- [ ] **Step 2: FAIL** — `bun test packages/env/src/polar-catalog.test.ts packages/api/src/billing-team.test.ts packages/api/src/billing.test.ts`

- [ ] **Step 3: Implement**

`packages/env/src/server.ts` add:

```ts
POLAR_PRODUCT_AGENCY: z.string().optional(),
POLAR_PRODUCT_AGENCY_UNLIMITED: z.string().optional(),
```

Keep `POLAR_PRODUCT_PRO` required. Re-export catalog helpers from `server.ts`.

`applyPolarSnapshot`:

```ts
const catalog = resolvePolarCatalog(env);
const plan = polar.status === "active" ? planForPolarProductId(catalog, polar.productId) : null;
if (!plan) return;
await applyPaidPlan(teamId, plan, {
  seats: Math.max(1, polar.seats),
  polarSubscriptionId: polar.subscriptionId,
  polarProductId: polar.productId,
});
```

Delete `isPolarProProduct` in `billing-team.ts` (replaced by `planForPolarProductId`).

`normalizeBillingState`: a Polar sub matches if `planForPolarProductId(resolvePolarCatalog(env), sub.productId)` is not null.

`.env.example` Polar section:

```bash
# Agency SKU (fallback if POLAR_PRODUCT_AGENCY is unset)
POLAR_PRODUCT_PRO="ee8722e7-7ea2-4040-a8d7-d32bdfcd03e9"
# Optional explicit Agency id (same product as POLAR_PRODUCT_PRO in production)
# POLAR_PRODUCT_AGENCY="ee8722e7-7ea2-4040-a8d7-d32bdfcd03e9"
# Agency Unlimited
POLAR_PRODUCT_AGENCY_UNLIMITED="a72406dd-cd21-416e-a443-a395d01bf2e3"
# Orch credit pack
POLAR_PRODUCT_ORCH_CREDITS="db04a245-5b14-417d-a579-afc372f92e6b"
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(billing): map Polar Agency and Unlimited product ids

EOF
)"
```

---

### Task 2: Checkout slugs `agency` and `agency-unlimited`

**Files:**
- Modify: `packages/auth/src/index.ts`
- Modify: `packages/api/src/routers/billing/service.ts`
- Modify: `packages/api/src/routers/billing/service.test.ts`
- Modify: `apps/web/src/features/billing/billing-queries.ts`
- Modify: `apps/web/src/features/billing/hooks/use-agency-paywall.ts`
- Modify: `apps/web/src/features/billing/containers/agency-paywall-container.tsx`
- Modify: `apps/web/src/features/user-settings/hooks/use-user-settings-modal-actions.ts`

**Interfaces:**
- Consumes: `polarCheckoutProducts(resolvePolarCatalog(env))`, `getTeamBilling` plan
- Produces: Better Auth slugs `agency` / `agency-unlimited`; seat checkout uses Unlimited product when the team is already Unlimited

- [ ] **Step 1: Tests**

`packages/api/src/routers/billing/service.test.ts` — after applying Unlimited, seat checkout must send the Unlimited product id:

```ts
test("seat checkout for an Unlimited team uses the Unlimited product", async () => {
  const previousUnlimited = Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED;
  Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = "polar-unlimited";
  const ownerId = await createFixtureUser();
  const team = await teamService.createTeam(ownerId, { name: "Unlimited Seats" });
  await billingTeam.applyPaidPlan(team.id, "agency_unlimited", { seats: 2 });

  await billingService.createSeatCheckout(ownerId, { teamId: team.id, seats: 3 });

  expect(createPolarCheckout).toHaveBeenCalledWith({
    productId: "polar-unlimited",
    seats: 3,
    teamId: team.id,
    actorUserId: ownerId,
  });
  if (previousUnlimited === undefined) {
    delete Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED;
  } else {
    Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = previousUnlimited;
  }
});
```

If env is cached at import, set `Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = "polar-unlimited"` at the top of the test file with the other Polar stubs.

Existing `createSeatCheckout` tests keep expecting the Agency product id (`polar-pro` / first `POLAR_PRODUCT_PRO`).

`confirmCheckout` of an Unlimited product must already succeed via Task 1’s `applyPolarSnapshot` — add only if the current confirm test hard-codes `plan: "agency"`:

If a confirm test asserts `plan: "agency"` for `polar-pro`, leave it. Add:

```ts
test("confirmCheckout of Unlimited activates agency_unlimited", async () => {
  fetchPolarCheckout.mockImplementationOnce(async (checkoutId: string) => ({
    teamId: "",
    checkoutId,
    productId: "polar-unlimited",
    seats: 1,
    subscriptionId: "sub_unl",
    status: "succeeded",
  }));
  // owner + team; stub teamId on the mock to team.id
  // expect confirmCheckout → billing.plan === "agency_unlimited"
});
```

Match the existing confirmCheckout test’s fixture/mock style (it already overwrites `teamId` after create). Copy that pattern; do not invent a second Polar client.

Paywall: no Playwright. Default slug change is asserted by grep-level unit if a billing-queries test exists; otherwise the paywall hook is a one-line slug swap reviewed in the diff.

- [ ] **Step 2: FAIL** — `bun test packages/api/src/routers/billing/service.test.ts`

- [ ] **Step 3: Implement**

`packages/auth/src/index.ts` checkout products:

```ts
import { env, polarCheckoutProducts, resolvePolarCatalog } from "@orch/env/server";

checkout({
  products: polarCheckoutProducts(resolvePolarCatalog(env)),
  successUrl: "/billing/success?checkout_id={CHECKOUT_ID}",
  authenticatedUsersOnly: true,
  returnUrl: new URL("/pricing", primaryCorsOrigin).toString(),
}),
```

Do not leave `{ productId: env.POLAR_PRODUCT_PRO, slug: "pro" }`.

`createSeatCheckout`:

```ts
const snapshot = await getTeamBilling(input.teamId);
const catalog = resolvePolarCatalog(env);
const productId =
  snapshot.plan === "agency_unlimited" && catalog.unlimitedProductId
    ? catalog.unlimitedProductId
    : catalog.agencyProductId;
```

`confirmCheckout`: replace `isPolarProProduct` with `planForPolarProductId(resolvePolarCatalog(env), checkout.productId)` — non-null means Agency SKU (pack path stays first).

Web:

```ts
async function checkoutBilling(slug: "agency" | "agency-unlimited" = "agency") {
  await authClient.checkout({ slug });
}
```

Paywall `checkout("agency")`. Settings unpaid path `checkout("agency")` (not default-less `checkout()`). Remove the Slice 5 comment in `agency-paywall-container.tsx`.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(billing): check out Agency and Unlimited Polar slugs

EOF
)"
```

---

### Task 3: Landing pricing table

**Files:**
- Create: `apps/web/src/components/marketing/landing-pricing-copy.ts`
- Create: `apps/web/src/components/marketing/landing-pricing-copy.test.ts`
- Modify: `apps/web/src/components/marketing/landing-pricing.tsx`

**Interfaces:**
- Consumes: `useBilling` `plan` (not `isPro` for paid CTAs)
- Produces: three-column table; headline locked; Agency checkout slug `agency`; Unlimited slug `agency-unlimited`

Locked copy in `landing-pricing-copy.ts` (do not put Polar or oRPC in this module):

```ts
export const LANDING_PRICING_HEADLINE = "Free to try. Agency when the trial ends.";
export const LANDING_PRICING_BODY =
  "Start on a 30-day Agency trial. After that, leftover Canvas stays on the leftover limits. Subscribe for seats when you are ready.";

export const LANDING_PRICING_COLUMNS = [
  { id: "trial", title: "Trial / leftover", price: "Free to try", hint: "30 days, then leftover Canvas" },
  { id: "agency", title: "Agency", price: "$19", hint: "per seat / month" },
  { id: "unlimited", title: "Agency Unlimited", price: "$19", hint: "per seat / month" },
] as const;

export const LANDING_PRICING_FEATURES = [
  { label: "Agency product", trial: "Trial only", agency: "On", unlimited: "On" },
  { label: "Clients", trial: "10", agency: "100", unlimited: "Uncapped" },
  { label: "Projects", trial: "30", agency: "300", unlimited: "Uncapped" },
  { label: "Tasks per project", trial: "2", agency: "50", unlimited: "Uncapped" },
  { label: "Workspace nodes", trial: "3", agency: "50", unlimited: "Uncapped" },
  { label: "Blocks per tab", trial: "2", agency: "24", unlimited: "24" },
  { label: "Orch messages", trial: "5 total", agency: "50 / seat / month", unlimited: "200 / seat / month" },
  { label: "Branded invoices", trial: "No", agency: "Yes", unlimited: "Yes" },
  { label: "Marketplace", trial: "No", agency: "View", unlimited: "Publish" },
  { label: "Task and knowledge files", trial: "No", agency: "50 MB / file", unlimited: "50 MB / file" },
] as const;
```

CTA helpers:

```ts
export function isPaidAgencyPlan(
  plan: "trial" | "leftover" | "agency" | "agency_unlimited" | undefined,
): boolean {
  return plan === "agency" || plan === "agency_unlimited";
}

export function landingAgencyCta(args: {
  isAuthenticated: boolean;
  plan: "trial" | "leftover" | "agency" | "agency_unlimited" | undefined;
}): { label: string; kind: "login" | "checkout-agency" | "portal" } {
  if (!args.isAuthenticated) return { label: "Get started", kind: "login" };
  if (isPaidAgencyPlan(args.plan)) return { label: "Manage billing", kind: "portal" };
  return { label: "Subscribe — 1 seat", kind: "checkout-agency" };
}

export function landingUnlimitedCta(args: {
  isAuthenticated: boolean;
  plan: "trial" | "leftover" | "agency" | "agency_unlimited" | undefined;
}): { label: string; kind: "login" | "checkout-unlimited" | "portal" } {
  if (!args.isAuthenticated) return { label: "Get started", kind: "login" };
  if (args.plan === "agency_unlimited") return { label: "Manage billing", kind: "portal" };
  return { label: "Subscribe", kind: "checkout-unlimited" };
}
```

Trial column button stays `Get started` / `Open Canvas` (existing trial-column behavior: login or `/canvas`). Do not put “$0 forever Agency” anywhere.

- [ ] **Step 1: Tests**

```ts
test("headline is the locked sentence", () => {
  expect(LANDING_PRICING_HEADLINE).toBe("Free to try. Agency when the trial ends.");
});

test("a leftover owner gets Subscribe — 1 seat, not Manage billing", () => {
  expect(landingAgencyCta({ isAuthenticated: true, plan: "leftover" })).toEqual({
    label: "Subscribe — 1 seat",
    kind: "checkout-agency",
  });
});

test("a trial owner is not treated as paid", () => {
  expect(landingAgencyCta({ isAuthenticated: true, plan: "trial" }).kind).toBe("checkout-agency");
});
```

Also assert no feature string equals `"Pro"` and the columns include `Agency Unlimited`.

- [ ] **Step 2: FAIL** — `bun test apps/web/src/components/marketing/landing-pricing-copy.test.ts`

- [ ] **Step 3: Implement** the table as three `<th>` columns. Agency button runs `landingAgencyCta`; Unlimited button runs `landingUnlimitedCta`. Checkout:

```ts
await checkout("agency");
await checkout("agency-unlimited");
```

Do not call `checkout("pro")`. Do not use `isPro` for these CTAs.

Keep the section `id="pricing"`. Do not add Polar SDK imports to the landing file (existing `useBilling` hook is allowed; it already wraps auth checkout).

- [ ] **Step 4: PASS** + `bun run check:golden` if new in-scope files

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(marketing): replace the Pro pricing table with Agency plans

EOF
)"
```

---

### Task 4: Drop Pro billing copy in chrome

**Files:**
- Create: `apps/web/src/features/billing/agency-plan-label.ts`
- Create: `apps/web/src/features/billing/agency-plan-label.test.ts`
- Modify: `apps/web/src/features/app-shell/app-shell-rail.tsx`
- Modify: `apps/web/src/features/app-shell/app-shell-account-menu.tsx`
- Modify: `apps/web/src/features/user-settings/hooks/use-user-settings-modal-actions.ts`
- Modify: `apps/web/src/features/user-settings/views/user-settings-modal-view.tsx`

**Interfaces:**
- Consumes: `plan` from `useBilling` / `deriveBillingState`
- Produces: labels `Trial` | `Leftover` | `Agency` | `Agency Unlimited`; leftover rail CTA `Subscribe — 1 seat`

Rail upgrade: show only when `plan === "leftover"` (not when `!isPro`). Click `checkout("agency")`. Button text `Subscribe — 1 seat`.

Account menu: `{agencyPlanLabel(plan)}` instead of `Pro plan` / `Free plan`. Pass `plan` into the view if this file is a view — it currently calls `useBilling` itself (pre-existing). Do not add Polar. Only change the string.

Settings billing pane: badge `agencyPlanLabel(plan)`; unpaid button `Subscribe — 1 seat`; paid button `Manage billing`. Description unpaid: `Subscribe to keep Tracker, projects, money, and people for this agency.` Description paid: `Manage billing, invoices, and seats.` `onBillingAction` uses `isPaidAgencyPlan(plan)` not `isPro`.

`deriveBillingState` may keep `isPro` as `legacyTier === "pro"` for non-billing callers this slice; chrome must not **display** the word Pro.

- [ ] **Step 1: Tests**

```ts
test("leftover is Leftover, not Free or Pro", () => {
  expect(agencyPlanLabel("leftover")).toBe("Leftover");
  expect(agencyPlanLabel("agency_unlimited")).toBe("Agency Unlimited");
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(billing): drop Pro from rail and settings copy

EOF
)"
```

---

### Task 5: Slice 5 verification

- [ ] **Step 1:** `bun test packages/env/src/polar-catalog.test.ts packages/api/src/billing.test.ts packages/api/src/billing-team.test.ts packages/api/src/routers/billing/service.test.ts apps/web/src/components/marketing/landing-pricing-copy.test.ts apps/web/src/features/billing/agency-plan-label.test.ts`
- [ ] **Step 2:** Confirm by search that billing/landing/paywall/rail/settings have no checkout slug `"pro"` and no user-visible `"Pro"` / `"Get Pro"` / `"Upgrade to Pro"` / `"Pro plan"` (ignore model-preset and pros/cons)
- [ ] **Step 3:** `bun run check-types`
- [ ] **Step 4:** `bun run check:conventions`
- [ ] **Step 5:** `bun run check:golden` if new in-scope files
- [ ] **Step 6:** `bun run check` — record pre-existing view failures only
- [ ] **Step 7:** Confirm: Agency slug checkout; Unlimited product → `agency_unlimited`; leftover landing CTA is `Subscribe — 1 seat`; trial is not treated as paid

Commit inventory if needed:

```bash
git commit -m "$(cat <<'EOF'
chore: inventory Slice 5 catalog files

EOF
)"
```

Railway still needs `POLAR_PRODUCT_AGENCY_UNLIMITED` set in production for Unlimited checkout to appear in the Better Auth plugin. Do not change Railway in this slice unless asked.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Checkout slugs `agency` / `agency-unlimited` | 2 |
| Polar Agency vs Unlimited product ids | 1 |
| Landing headline + Trial/leftover vs Agency vs Unlimited | 3 |
| Drop “Pro” billing copy | 3, 4 |
| Paywall Subscribe — 1 seat still Agency 1-seat | 2, 4 |
| Seat quantity still Polar `seats` (Slice 3) | 2 (Unlimited SKU when already Unlimited) |
| Credit packs unchanged | 1 (unknown id no-op) |
| Model-preset Pro unchanged | (explicit non-goal) |
