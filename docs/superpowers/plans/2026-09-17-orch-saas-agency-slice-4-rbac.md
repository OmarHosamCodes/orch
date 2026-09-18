# Orch SaaS Agency Slice 4 — Editor work book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editors can file clients, projects, tasks, tags, templates, and journeys; viewers only track themselves (own time + own live timer); owners keep rates, money, reports, people policy, and seats; role misses are `FORBIDDEN` `insufficient_role`, not `UNAUTHORIZED`.

**Architecture:** One gate in `requireTeamMembership`. Membership missing stays `UNAUTHORIZED`. Role too low becomes `FORBIDDEN` `{ code: "insufficient_role" }`. Agency writes that the spec moved to editors change `requireAgencyRole(..., "owner")` to `"editor"`. Commercial fields (rate, currency, category) stay owner inside the same service. Live-timer list filters to `actorUserId` when the role is `viewer`. Money scoreboard requires owner.

**Tech Stack:** Bun, Drizzle/Postgres, oRPC, golden-file services and web hooks/views.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-17-orch-saas-agency-design.md` (RBAC table + tests)
- Slices 1–3 already shipped team snapshot, volume caps, seats, Orch credits. Do not rework Polar slugs, landing copy, or checkout (Slice 5)
- Golden file: schema → service `(actorUserId, input)` → router `.parse()` → hook → container → view
- Views do not import oRPC, Polar SDK, Drizzle, stores, or `getBillingStateForUser`
- Copy: never say “Pro”. Sentence case. No exclamation marks
- `FORBIDDEN` `data.code` this slice: `insufficient_role` (keep `trial_ended`, `not_entitled`, `limit_reached`, `seat_required`, `orch_credits`, `upload_blocked`)
- Locked role copy (owner-required): `Only the owner can change billing and invoices.`
- Locked editor-required copy: `You need editor access for this action.`
- Not a team member: still `UNAUTHORIZED` (not a role miss)
- Role miss (member, too low): `FORBIDDEN` `{ data: { code: "insufficient_role" } }`
- Every role is a full seat. Adding test members requires billed seats covering **owner plus each invite** (`applyPaidPlan` seats: `1 + n`). Owner+editor is `seats: 2`. Owner+editor+viewer is `seats: 3`. Otherwise invite throws `seat_required`
- `canViewBilling` on client cards stays owner
- Editors file a client (name, icon, archive, contact) so a project has a home; they cannot set rate, currency, or commercial category
- Viewer: own time yes; everyone’s time no; live timers self only
- Editor/owner: everyone’s time yes; live timers team
- Reports stay owner. People policy / tenure / departments stay owner. Seats / Polar / invite / roles stay owner
- Money scoreboard requires owner (`getPeriodScoreboard` is `viewer` today)
- Canvas team nodes already use editor — do not regress
- Inject `now` into billing reads. Bun only. Conventional commits on `from-brainiac-to-orch`
- Pre-existing `bun run check` view-hook failures are out of scope
- Do not implement Polar slugs `agency` / `agency-unlimited` or landing rewrite

## File map

- Modify: `packages/api/src/lib/team-membership.ts` — role miss → `insufficient_role`
- Create: `packages/api/src/lib/team-membership.test.ts`
- Modify: `packages/api/src/routers/agency-ops/clients/service.ts` — create/update/archive/contact editor; commercial fields owner
- Modify: `packages/api/src/routers/agency-ops/projects/service.ts` — create/update/journey/trash editor
- Modify: `packages/api/src/routers/agency-ops/tasks/service.ts` — create/delete editor (rate still owner)
- Modify: `packages/api/src/routers/agency-ops/tags/service.ts` — create/update/delete editor
- Modify: `packages/api/src/routers/agency-ops/project-templates/service.ts` — writes editor
- Modify: `packages/api/src/routers/agency-ops/time-tracking/service.ts` — `listAgencyActiveMembers` self-only for viewer; `getAgencyTimeSummary` editor
- Modify: `packages/api/src/routers/agency-ops/billing/money-scoreboard-service.ts` — owner
- Modify: `apps/web/src/features/clients/hooks/use-agency-clients-table.ts` + related client hooks — `canEditRecords` vs `canEditRates`
- Modify: `apps/web/src/features/projects/hooks/use-agency-projects-table.ts` + `use-agency-project-detail.ts`
- Modify: matching `*-view.tsx` props (create/archive buttons use `canEditRecords`; rate fields stay `isOwner` / `canEditRates`)
- Modify: `docs/golden-file-source-inventory.md` if new in-scope files

Shared test helper (copy into each new test file with top-of-file imports; do not invent a `utils.ts`):

```ts
async function addPaidMember(args: {
  ownerId: string;
  teamId: string;
  memberId: string;
  role: "editor" | "viewer";
  seats?: number;
}) {
  await applyPaidPlan(args.teamId, "agency", { seats: args.seats ?? 2 });
  await addTeamMember(args.ownerId, {
    teamId: args.teamId,
    userEmail: `${args.memberId}@example.test`,
    role: args.role,
  });
}
```

`createFixtureUser` / `createTeam` — copy the existing helpers from `packages/api/src/billing-team.test.ts`.

---

### Task 1: Role miss is `insufficient_role`

**Files:**
- Modify: `packages/api/src/lib/team-membership.ts`
- Create: `packages/api/src/lib/team-membership.test.ts`

**Interfaces:**

```ts
export function insufficientRoleError(required: WorkspaceTeamRole): ORPCError {
  return new ORPCError("FORBIDDEN", {
    message:
      required === "owner"
        ? "Only the owner can change billing and invoices."
        : "You need editor access for this action.",
    data: { code: "insufficient_role" },
  });
}
```

`requireTeamMembership`:
- No membership row → `UNAUTHORIZED` (unchanged, no `data.code`)
- Membership exists but `!hasRoleAtLeast` → throw `insufficientRoleError(requiredRole)`
- Do not change `requireAgencyRole` besides inheriting the new throw

- [ ] **Step 1: Failing tests**

```ts
test("a viewer cannot satisfy editor and gets insufficient_role", async () => {
  const ownerId = await createFixtureUser();
  const editorId = await createFixtureUser();
  const team = await teamService.createTeam(ownerId, { name: "Roles" });
  await applyPaidPlan(team.id, "agency", { seats: 2 });
  await teamService.addTeamMember(ownerId, {
    teamId: team.id,
    userEmail: `${editorId}@example.test`,
    role: "viewer",
  });
  await expect(requireTeamMembership(editorId, team.id, "editor")).rejects.toMatchObject({
    code: "FORBIDDEN",
    message: "You need editor access for this action.",
    data: { code: "insufficient_role" },
  });
});

test("a non-member is still UNAUTHORIZED", async () => {
  const ownerId = await createFixtureUser();
  const strangerId = await createFixtureUser();
  const team = await teamService.createTeam(ownerId, { name: "Roles" });
  await expect(requireTeamMembership(strangerId, team.id, "viewer")).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
});
```

Also assert owner-required miss uses `Only the owner can change billing and invoices.`

- [ ] **Step 2: FAIL** — `bun test packages/api/src/lib/team-membership.test.ts`

- [ ] **Step 3: Implement**

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(api): return insufficient_role instead of UNAUTHORIZED on role miss

EOF
)"
```

---

### Task 2: Editor client records; commercial fields stay owner

**Files:**
- Modify: `packages/api/src/routers/agency-ops/clients/service.ts`
- Create: `packages/api/src/routers/agency-ops/clients/service.rbac.test.ts`

**Interfaces:**
- `createAgencyClient` / `updateAgencyClient` (non-rate) / `archiveAgencyClient` / `unarchiveAgencyClient` / contact upsert: `requireAgencyRole(..., "editor")`
- If create/update input sets `billableRateAmount`, `currency`, or `category` (including explicit `undefined` skip — only when the key is present and would change commercial state): `requireAgencyRole(..., "owner")` **or** throw `insufficientRoleError("owner")` after an editor gate
- `canViewBilling` remains `role === "owner"` on list/detail

Locked: editor can create `{ teamId, name }` with default `category: "external"` and no rate. Passing `billableRateAmount`, `currency`, or `category` on create is an owner-only commercial write.

- [ ] **Step 1: Tests**

```ts
test("editor creates a client record without a rate", async () => {
  // owner + paid seats:2 + editor member
  await expect(
    createAgencyClient(editorId, { teamId: team.id, name: "Acme" }),
  ).resolves.toMatchObject({ name: "Acme" });
});

test("editor setting a rate is insufficient_role", async () => {
  await expect(
    createAgencyClient(editorId, {
      teamId: team.id,
      name: "Priced",
      billableRateAmount: 10000,
    }),
  ).rejects.toMatchObject({
    data: { code: "insufficient_role" },
    message: "Only the owner can change billing and invoices.",
  });
});

test("viewer cannot create a client", async () => {
  await expect(
    createAgencyClient(viewerId, { teamId: team.id, name: "Nope" }),
  ).rejects.toMatchObject({ data: { code: "insufficient_role" } });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: PASS** — `bun test packages/api/src/routers/agency-ops/clients/service.rbac.test.ts`

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(clients): let editors file client records without setting rates

EOF
)"
```

---

### Task 3: Editor projects, tasks, tags, templates, journey

**Files:**
- Modify: `packages/api/src/routers/agency-ops/projects/service.ts` — every `requireAgencyRole(..., "owner")` that is project/journey/trash (not budgets/money)
- Modify: `packages/api/src/routers/agency-ops/tasks/service.ts` — `createAgencyProjectTask` and `deleteAgencyProjectTask` → `"editor"` (task rate patch already owner)
- Modify: `packages/api/src/routers/agency-ops/tags/service.ts` — writes → `"editor"`
- Modify: `packages/api/src/routers/agency-ops/project-templates/service.ts` — writes → `"editor"`
- Create: `packages/api/src/routers/agency-ops/projects/service.rbac.test.ts`

Do **not** lower money, reports, tenure, departments, or billing services.

`createAgencyProject` template branch calls `createAgencyProjectWithJourney` — both must be editor.

- [ ] **Step 1: Tests**

```ts
test("editor creates a project and a task", async () => {
  const client = await createAgencyClient(editorId, { teamId: team.id, name: "Home" });
  const project = await createAgencyProject(editorId, {
    teamId: team.id,
    clientId: client.id,
    name: "Site",
  });
  await expect(
    createAgencyProjectTask(editorId, {
      teamId: team.id,
      projectId: project.id,
      title: "Build",
    }),
  ).resolves.toMatchObject({ title: "Build" });
});

test("viewer cannot create a project", async () => {
  await expect(
    createAgencyProject(viewerId, {
      teamId: team.id,
      clientId: client.id,
      name: "Nope",
    }),
  ).rejects.toMatchObject({ data: { code: "insufficient_role" } });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: PASS** — `bun test packages/api/src/routers/agency-ops/projects/service.rbac.test.ts`

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(agency): let editors create projects, tasks, tags, and templates

EOF
)"
```

---

### Task 4: Viewer live timer is self-only; team time summary is editor

**Files:**
- Modify: `packages/api/src/routers/agency-ops/time-tracking/service.ts` — `listAgencyActiveMembers`, `getAgencyTimeSummary`
- Create: `packages/api/src/routers/agency-ops/time-tracking/service.rbac.test.ts`

**Interfaces:**

`listAgencyActiveMembers`: `const role = await requireAgencyRole(..., "viewer")`. If `role === "viewer"`, add `eq(agencyOpsActiveTimer.userId, actorUserId)` to the where. Editor/owner keep the team list.

`getAgencyTimeSummary` (everyone’s time): `requireAgencyRole(..., "editor")`. Viewers keep `listMyAgencyTimeEntries`. `listAllAgencyTimeEntries` is already editor.

- [ ] **Step 1: Tests**

```ts
test("viewer live timers include only themselves", async () => {
  await startAgencyTimer(ownerId, { teamId: team.id });
  await startAgencyTimer(viewerId, { teamId: team.id });
  const listed = await listAgencyActiveMembers(viewerId, { teamId: team.id });
  expect(listed.items.map((row) => row.userId)).toEqual([viewerId]);
});

test("editor live timers include the team", async () => {
  const listed = await listAgencyActiveMembers(editorId, { teamId: team.id });
  expect(listed.items.map((row) => row.userId).sort()).toEqual([editorId, ownerId].sort());
});

test("viewer cannot load the team time summary", async () => {
  await expect(
    getAgencyTimeSummary(viewerId, { teamId: team.id, from: "...", to: "..." }),
  ).rejects.toMatchObject({ data: { code: "insufficient_role" } });
});
```

Use `applyPaidPlan(..., { seats: 3 })` when the fixture has owner + editor + viewer.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(tracker): show viewers only their own live timer

EOF
)"
```

---

### Task 5: Money scoreboard is owner-only

**Files:**
- Modify: `packages/api/src/routers/agency-ops/billing/money-scoreboard-service.ts`
- Create: `packages/api/src/routers/agency-ops/billing/money-scoreboard-service.rbac.test.ts`

**Interfaces:**
- `getPeriodScoreboard`: `requireAgencyRole(..., "owner")` (drop the viewer gate + `if (role === "owner")` around `syncFormulaPayoutLines` — owner is now required, so always sync)
- Reports already owner — do not change unless a report procedure is `viewer`
- Web money hooks already `enabled: isOwner` — do not expand to editors

- [ ] **Step 1: Tests**

```ts
test("editor cannot load the period scoreboard", async () => {
  await expect(
    getPeriodScoreboard(editorId, {
      teamId: team.id,
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
    }),
  ).rejects.toMatchObject({
    data: { code: "insufficient_role" },
    message: "Only the owner can change billing and invoices.",
  });
});

test("owner can load the period scoreboard", async () => {
  await expect(
    getPeriodScoreboard(ownerId, {
      teamId: team.id,
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
    }),
  ).resolves.toMatchObject({ currency: expect.any(String) });
});
```

Match the real scoreboard return shape (`currency` exists on the built object). If the owner test needs money settings, use the same period helpers as existing money tests.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(money): require owner for the period scoreboard

EOF
)"
```

---

### Task 6: Web capability flags for editor records vs owner rates

**Files:**
- Modify: `apps/web/src/features/clients/hooks/use-agency-clients-table.ts`
- Modify: `apps/web/src/features/clients/hooks/use-agency-client-detail.ts`
- Modify: `apps/web/src/features/clients/agency-clients-table-view.tsx` (props only — no new hooks in the view)
- Modify: `apps/web/src/features/clients/agency-client-detail-view.tsx`
- Modify: `apps/web/src/features/projects/hooks/use-agency-projects-table.ts`
- Modify: `apps/web/src/features/projects/hooks/use-agency-project-detail.ts`
- Modify: `apps/web/src/features/projects/agency-projects-table-view.tsx`
- Modify: `apps/web/src/features/projects/agency-project-detail-view.tsx`
- Modify: `apps/web/src/features/task-management/hooks/use-agency-my-tasks-edit-dialog.ts` — create/edit task fields use editor; billable rate stays `isOwner`

**Interfaces:**

```ts
const role = teamQuery.data?.role;
const canEditRecords = role === "owner" || role === "editor";
const canEditRates = role === "owner";
```

Create / archive / name / icon / add-project buttons bind `canEditRecords`. Rate, currency, category, `canViewBilling` UI bind `canEditRates` / existing `isOwner`. Do not put Polar or oRPC in views. Do not add hooks to views.

If a view currently takes only `isOwner` for both create and rates, split the prop. Keep the name `isOwner` where it still means owner-only.

- [ ] **Step 1: Tests** — add or extend a hook/view-model unit test if one exists for these hooks; otherwise a focused test file next to the hook that asserts `canEditRecords` is true for `editor`. Do not add Playwright. Do not fix pre-existing golden-view-no-hooks failures.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: PASS** + `bun run check:golden` if files are relocated

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(agency): let editors open client and project create in the UI

EOF
)"
```

---

### Task 7: Slice 4 verification

- [ ] **Step 1:** `bun test packages/api/src/lib/team-membership.test.ts packages/api/src/routers/agency-ops/clients/service.rbac.test.ts packages/api/src/routers/agency-ops/projects/service.rbac.test.ts packages/api/src/routers/agency-ops/time-tracking/service.rbac.test.ts packages/api/src/routers/agency-ops/billing/money-scoreboard-service.rbac.test.ts`
- [ ] **Step 2:** `bun run check-types`
- [ ] **Step 3:** `bun run check:conventions`
- [ ] **Step 4:** `bun run check:golden` if new in-scope files
- [ ] **Step 5:** `bun run check` — record pre-existing view failures only
- [ ] **Step 6:** Confirm: editor client/project/task create; editor rate is `insufficient_role`; viewer live timers self-only; role miss is `FORBIDDEN`; scoreboard owner; non-member still `UNAUTHORIZED`

Commit inventory if needed:

```bash
git commit -m "$(cat <<'EOF'
chore: inventory Slice 4 RBAC files

EOF
)"
```

---

## Later slices (do not implement here)

- Slice 5: Polar slugs `agency` / `agency-unlimited`; landing table; drop Pro copy

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Role miss `FORBIDDEN` `insufficient_role` | 1 |
| Editor client record; rate/currency/category owner | 2, 6 |
| `canViewBilling` owner | 2, 6 |
| Editor project/task/tags/templates/journey | 3, 6 |
| Viewer live timer self only | 4 |
| Everyone’s time editor/owner | 4 |
| Money scoreboard owner | 5 |
| Reports / people / seats stay owner | (unchanged) |
| Polar slugs / landing | Slice 5 |
