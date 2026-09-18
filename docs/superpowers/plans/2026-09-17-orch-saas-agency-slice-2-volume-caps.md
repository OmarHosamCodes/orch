# Orch SaaS Agency Slice 2 — Volume caps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce Agency volume caps on create/save (clients, projects, tasks per project, canvas nodes/blocks/tabs) and block task/knowledge file uploads on trial and leftover.

**Architecture:** `assertWithinLimit(teamId, counter, extra?)` in `packages/api/src/billing-team.ts` is the only place that counts and throws `limit_reached`. Agency create services call it after `requireAgencyRole`. Canvas save uses the actor’s owned Agency team (leftover still saves, at leftover caps) and does **not** call `assertAgencyEntitled`. Upload Hono routes call `assertTaskAndKnowledgeUploadsAllowed` and return HTTP 403. Fail the write; never truncate.

**Tech Stack:** Bun, Drizzle/Postgres, oRPC, Hono uploads, golden-file services.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-17-orch-saas-agency-design.md`
- Slice 1 already shipped team snapshot, trial clock, auto Agency, `assertAgencyEntitled`. Do not rework Polar, seats, Orch packs, editor RBAC, or landing catalog
- Golden file: schema → service `(actorUserId, input)` → router `.parse()` → hook → container → view
- Views do not import oRPC, Polar, Drizzle, or `getBillingStateForUser`
- Copy: never say “Pro”; cap / upload strings are locked in the spec
- `FORBIDDEN` `data.code` values this slice: `limit_reached`, `upload_blocked` (keep `trial_ended` / `not_entitled`)
- `null` plan limit means skip (Unlimited clients/projects/tasks). Do not treat `0` as skip — leftover clients/projects/tasks are 0
- Over-limit fails the create; do not delete or truncate existing rows to fit
- Canvas leftover remains: leftover users may save workspace nodes; cap is leftover 3 nodes / 2 blocks / 1 tab, not Polar Free 10
- Avatars and team logo stay allowed on leftover
- Task-thread and knowledge uploads are off on trial/leftover; paid keeps today’s 50 MB per-file cap
- Inject `now` into billing reads (`getTeamBilling(teamId, now)`) so tests do not wait 30 days
- Bun only; `bun test <file>` then `bun run check`, `bun run check-types`, `bun run check:conventions`; `bun run check:golden` when adding in-scope files
- Do not implement `members` or `orchMessages` counters (Slice 3)
- Do not implement Polar seat quantity, invite checkout, Orch credit packs, editor project-create, or landing rewrite
- Default git branch `dev`; this work stays on `from-brainiac-to-orch`; conventional commits
- Pre-existing `bun run check` failures on unrelated views are out of scope; do not “fix” them in this slice

## File map

- Modify: `packages/api/src/billing-team.ts` — `assertWithinLimit`, `assertTaskAndKnowledgeUploadsAllowed`, shared `FORBIDDEN` helpers
- Modify: `packages/api/src/billing-team.test.ts` — cap and upload-flag tests (same DB fixtures as Slice 1)
- Modify: `packages/api/src/routers/agency-ops/clients/service.ts` — `createAgencyClient`
- Modify: `packages/api/src/routers/agency-ops/projects/service.ts` — `createAgencyProject`, `createAgencyProjectWithJourney`
- Modify: `packages/api/src/routers/agency-ops/tasks/service.ts` — `createAgencyProjectTask` (new titles only)
- Modify: `packages/api/src/routers/workspace/service.ts` — `assertCanSaveWorkspaceNodes` uses team snapshot
- Modify: `apps/server/src/lib/task-attachments.ts` — trial/leftover 403
- Modify: `apps/server/src/lib/knowledge-sources.ts` — trial/leftover 403
- Modify: `apps/web/src/features/billing/agency-paywall-copy.ts` — export cap/upload copy helpers used by tests (server owns RPC messages; this file documents locked strings if UI maps `data.code`)
- Test: `packages/api/src/routers/workspace/service.ts` coverage via `packages/api/src/billing-team.test.ts` plus a focused workspace save test file if save needs HTTP-free unit coverage
- Modify: `docs/golden-file-source-inventory.md` — only if a new in-scope source file is added

Do **not** add `assertWithinLimit` for members or orch. Do **not** change Polar product slugs.

Locked error copy:

| Case | `data.code` | `message` |
|---|---|---|
| Clients on trial | `limit_reached` | `This agency can have 10 clients on the trial. Subscribe to add more.` |
| Projects on trial | `limit_reached` | `This agency can have 30 projects on the trial. Subscribe to add more.` |
| Tasks/project on trial | `limit_reached` | `This agency can have 2 tasks per project on the trial. Subscribe to add more.` |
| Nodes on leftover | `limit_reached` | `This agency can have 3 workspace nodes on leftover. Subscribe to add more.` |
| Blocks on leftover | `limit_reached` | `This agency can have 2 blocks per tab on leftover. Subscribe to add more.` |
| Tabs on trial | `limit_reached` | `This agency can have 1 tab per node on the trial. Subscribe to add more.` |
| Agency 101st client | `limit_reached` | `This agency can have 100 clients on Agency. Subscribe to add more.` |
| Uploads trial/leftover | `upload_blocked` | `File uploads are included with Agency. Subscribe to attach files.` |

Plan phrase map (locked): `trial` → `the trial`; `leftover` → `leftover`; `agency` → `Agency`; `agency_unlimited` → `Agency Unlimited`.

Noun map (locked): `clients` → `clients`; `projects` → `projects`; `tasksPerProject` → `tasks per project`; `nodes` → `workspace nodes`; `blocks` → `blocks per tab`; `tabs` → `tabs per node`.

---

### Task 1: `assertWithinLimit` (counts + copy)

**Files:**
- Modify: `packages/api/src/billing-team.ts`
- Modify: `packages/api/src/billing-team.test.ts`

**Interfaces:**
- Consumes: `getTeamBilling(teamId, now?)`, `AGENCY_PLAN_LIMITS`, Slice 1 fixtures (`createFixtureUser`, `createUnbilledTeam` / `createTeam`, `insertTrialBilling`, `applyPaidPlan`)
- Produces:

```ts
export type VolumeCounter =
  | "clients"
  | "projects"
  | "tasksPerProject"
  | "nodes"
  | "blocks"
  | "tabs";

export async function assertWithinLimit(
  teamId: string,
  counter: VolumeCounter,
  extra?: {
    projectId?: string;
    adding?: number; // default 1; journey uses milestoneCount + 1 (anchor)
    count?: number; // required for nodes | blocks | tabs (payload size, not a DB count)
    now?: Date;
  },
): Promise<void>;

export async function assertTaskAndKnowledgeUploadsAllowed(
  teamId: string,
  now?: Date,
): Promise<void>;
```

`tasksPerProject` requires `extra.projectId` (may be a not-yet-inserted id → count 0). `nodes` / `blocks` / `tabs` require `extra.count`. Missing required extra → `BAD_REQUEST`.

- [ ] **Step 1: Write the failing tests** (append a new `describe("assertWithinLimit")` in `packages/api/src/billing-team.test.ts`; reuse fixture helpers already in that file)

```ts
import { agencyOpsClient, agencyOpsProject, agencyOpsProjectTask } from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";

async function seedClients(teamId: string, ownerId: string, n: number) {
  const now = new Date("2026-09-17T00:00:00.000Z");
  if (n === 0) return;
  await db.insert(agencyOpsClient).values(
    Array.from({ length: n }, (_, i) => ({
      id: createWorkspaceId("agency-client"),
      teamId,
      name: `Seed ${i}`,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

describe("assertWithinLimit", () => {
  test("the 11th trial client is limit_reached with locked copy", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    await seedClients(team.id, ownerId, 10);
    await expect(billingTeam.assertWithinLimit(team.id, "clients")).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This agency can have 10 clients on the trial. Subscribe to add more.",
      data: { code: "limit_reached" },
    });
  });

  test("the 10th trial client is allowed", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    await seedClients(team.id, ownerId, 9);
    await expect(billingTeam.assertWithinLimit(team.id, "clients")).resolves.toBeUndefined();
  });

  test("archived clients do not consume the cap", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    await seedClients(team.id, ownerId, 10);
    await db
      .update(agencyOpsClient)
      .set({ archivedAt: new Date("2026-09-17T00:00:00.000Z") })
      .where(eq(agencyOpsClient.teamId, team.id));
    await expect(billingTeam.assertWithinLimit(team.id, "clients")).resolves.toBeUndefined();
  });

  test("Agency fails the 101st client; Unlimited does not", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Paid Agency" });
    await billingTeam.applyPaidPlan(team.id, "agency", { seats: 1 });
    await seedClients(team.id, ownerId, 100);
    await expect(billingTeam.assertWithinLimit(team.id, "clients")).rejects.toMatchObject({
      data: { code: "limit_reached" },
      message: "This agency can have 100 clients on Agency. Subscribe to add more.",
    });
    await billingTeam.applyPaidPlan(team.id, "agency_unlimited", { seats: 1 });
    await expect(billingTeam.assertWithinLimit(team.id, "clients")).resolves.toBeUndefined();
  });

  test("the 31st trial project is limit_reached", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    const now = new Date("2026-09-17T00:00:00.000Z");
    const [client] = await db
      .insert(agencyOpsClient)
      .values({
        id: createWorkspaceId("agency-client"),
        teamId: team.id,
        name: "Client",
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsClient.id });
    await db.insert(agencyOpsProject).values(
      Array.from({ length: 30 }, (_, i) => ({
        id: createWorkspaceId("agency-project"),
        teamId: team.id,
        clientId: client!.id,
        name: `P${i}`,
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })),
    );
    await expect(billingTeam.assertWithinLimit(team.id, "projects")).rejects.toMatchObject({
      message: "This agency can have 30 projects on the trial. Subscribe to add more.",
      data: { code: "limit_reached" },
    });
  });

  test("soft-deleted projects do not consume the cap", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    const now = new Date("2026-09-17T00:00:00.000Z");
    const [client] = await db
      .insert(agencyOpsClient)
      .values({
        id: createWorkspaceId("agency-client"),
        teamId: team.id,
        name: "Client",
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsClient.id });
    await db.insert(agencyOpsProject).values(
      Array.from({ length: 30 }, (_, i) => ({
        id: createWorkspaceId("agency-project"),
        teamId: team.id,
        clientId: client!.id,
        name: `P${i}`,
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
        deletedAt: now,
      })),
    );
    await expect(billingTeam.assertWithinLimit(team.id, "projects")).resolves.toBeUndefined();
  });

  test("the 3rd trial task on a project is limit_reached", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    const now = new Date("2026-09-17T00:00:00.000Z");
    const [client] = await db
      .insert(agencyOpsClient)
      .values({
        id: createWorkspaceId("agency-client"),
        teamId: team.id,
        name: "Client",
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsClient.id });
    const [project] = await db
      .insert(agencyOpsProject)
      .values({
        id: createWorkspaceId("agency-project"),
        teamId: team.id,
        clientId: client!.id,
        name: "P",
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsProject.id });
    await db.insert(agencyOpsProjectTask).values(
      Array.from({ length: 2 }, (_, i) => ({
        id: createWorkspaceId("agency-project-task"),
        teamId: team.id,
        projectId: project!.id,
        title: `T${i}`,
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })),
    );
    await expect(
      billingTeam.assertWithinLimit(team.id, "tasksPerProject", { projectId: project!.id }),
    ).rejects.toMatchObject({
      message: "This agency can have 2 tasks per project on the trial. Subscribe to add more.",
      data: { code: "limit_reached" },
    });
  });

  test("journey adding 3 tasks on an empty trial project is limit_reached", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    const projectId = createWorkspaceId("agency-project");
    await expect(
      billingTeam.assertWithinLimit(team.id, "tasksPerProject", { projectId, adding: 3 }),
    ).rejects.toMatchObject({
      data: { code: "limit_reached" },
    });
    await expect(
      billingTeam.assertWithinLimit(team.id, "tasksPerProject", { projectId, adding: 2 }),
    ).resolves.toBeUndefined();
  });

  test("leftover canvas 4 nodes is limit_reached; 3 nodes is allowed", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Leftover Agency" });
    const after = new Date("2026-12-01T00:00:00.000Z");
    await db
      .update(workspaceTeamBilling)
      .set({ trialEndsAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(workspaceTeamBilling.teamId, team.id));
    await expect(
      billingTeam.assertWithinLimit(team.id, "nodes", { count: 4, now: after }),
    ).rejects.toMatchObject({
      message: "This agency can have 3 workspace nodes on leftover. Subscribe to add more.",
      data: { code: "limit_reached" },
    });
    await expect(
      billingTeam.assertWithinLimit(team.id, "nodes", { count: 3, now: after }),
    ).resolves.toBeUndefined();
  });

  test("leftover 3 blocks per tab is limit_reached", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Leftover Agency" });
    const after = new Date("2026-12-01T00:00:00.000Z");
    await db
      .update(workspaceTeamBilling)
      .set({ trialEndsAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(workspaceTeamBilling.teamId, team.id));
    await expect(
      billingTeam.assertWithinLimit(team.id, "blocks", { count: 3, now: after }),
    ).rejects.toMatchObject({
      message: "This agency can have 2 blocks per tab on leftover. Subscribe to add more.",
      data: { code: "limit_reached" },
    });
  });

  test("trial uploads are blocked; paid Agency uploads are allowed", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Upload Agency" });
    await expect(billingTeam.assertTaskAndKnowledgeUploadsAllowed(team.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "File uploads are included with Agency. Subscribe to attach files.",
      data: { code: "upload_blocked" },
    });
    await billingTeam.applyPaidPlan(team.id, "agency", { seats: 1 });
    await expect(billingTeam.assertTaskAndKnowledgeUploadsAllowed(team.id)).resolves.toBeUndefined();
  });
});
```

If `agencyOpsProjectTask` insert requires additional NOT NULL columns, set every required field the same way existing task integration tests do. There is no `titleKey` column — do not invent extra columns.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/api/src/billing-team.test.ts`

Expected: FAIL (`assertWithinLimit` / `assertTaskAndKnowledgeUploadsAllowed` missing)

- [ ] **Step 3: Write minimal implementation**

In `packages/api/src/billing-team.ts` add (keep existing snapshot functions). Use `count()` from drizzle-orm. Exhaustive `switch` on `counter` with `never` default.

```ts
import { and, count, eq, isNull } from "drizzle-orm";
import { agencyOpsClient, agencyOpsProject, agencyOpsProjectTask } from "@orch/db/schema";

export type VolumeCounter =
  | "clients"
  | "projects"
  | "tasksPerProject"
  | "nodes"
  | "blocks"
  | "tabs";

function planPhrase(plan: AgencyPlan): string {
  switch (plan) {
    case "trial":
      return "the trial";
    case "leftover":
      return "leftover";
    case "agency":
      return "Agency";
    case "agency_unlimited":
      return "Agency Unlimited";
    default: {
      const _exhaustive: never = plan;
      return _exhaustive;
    }
  }
}

function volumeNoun(counter: VolumeCounter): string {
  switch (counter) {
    case "clients":
      return "clients";
    case "projects":
      return "projects";
    case "tasksPerProject":
      return "tasks per project";
    case "nodes":
      return "workspace nodes";
    case "blocks":
      return "blocks per tab";
    case "tabs":
      return "tabs per node";
    default: {
      const _exhaustive: never = counter;
      return _exhaustive;
    }
  }
}

function limitReachedError(plan: AgencyPlan, counter: VolumeCounter, n: number) {
  return new ORPCError("FORBIDDEN", {
    message: `This agency can have ${n} ${volumeNoun(counter)} on ${planPhrase(plan)}. Subscribe to add more.`,
    data: { code: "limit_reached", plan, counter, limit: n },
  });
}

function uploadBlockedError() {
  return new ORPCError("FORBIDDEN", {
    message: "File uploads are included with Agency. Subscribe to attach files.",
    data: { code: "upload_blocked" },
  });
}

function numericLimit(value: number | null | undefined): number | null {
  if (value == null) return null;
  return value;
}

export async function assertWithinLimit(
  teamId: string,
  counter: VolumeCounter,
  extra?: {
    projectId?: string;
    adding?: number;
    count?: number;
    now?: Date;
  },
) {
  const snapshot = await getTeamBilling(teamId, extra?.now);
  const adding = extra?.adding ?? 1;
  let limit: number | null;
  let used: number;

  switch (counter) {
    case "clients":
      limit = numericLimit(snapshot.limits.clients);
      used = (
        await db
          .select({ value: count() })
          .from(agencyOpsClient)
          .where(and(eq(agencyOpsClient.teamId, teamId), isNull(agencyOpsClient.archivedAt)))
      )[0]!.value;
      break;
    case "projects":
      limit = numericLimit(snapshot.limits.projects);
      used = (
        await db
          .select({ value: count() })
          .from(agencyOpsProject)
          .where(and(eq(agencyOpsProject.teamId, teamId), isNull(agencyOpsProject.deletedAt)))
      )[0]!.value;
      break;
    case "tasksPerProject": {
      if (!extra?.projectId) {
        throw new ORPCError("BAD_REQUEST", { message: "projectId is required." });
      }
      limit = numericLimit(snapshot.limits.tasksPerProject);
      used = (
        await db
          .select({ value: count() })
          .from(agencyOpsProjectTask)
          .where(
            and(
              eq(agencyOpsProjectTask.teamId, teamId),
              eq(agencyOpsProjectTask.projectId, extra.projectId),
            ),
          )
      )[0]!.value;
      break;
    }
    case "nodes":
      if (extra?.count == null) {
        throw new ORPCError("BAD_REQUEST", { message: "count is required." });
      }
      limit = snapshot.limits.workspaceNodes;
      used = extra.count;
      break;
    case "blocks":
      if (extra?.count == null) {
        throw new ORPCError("BAD_REQUEST", { message: "count is required." });
      }
      limit = snapshot.limits.blocksPerTab;
      used = extra.count;
      break;
    case "tabs":
      if (extra?.count == null) {
        throw new ORPCError("BAD_REQUEST", { message: "count is required." });
      }
      limit = snapshot.limits.tabsPerNode;
      used = extra.count;
      break;
    default: {
      const _exhaustive: never = counter;
      throw new ORPCError("BAD_REQUEST", { message: String(_exhaustive) });
    }
  }

  if (limit == null) return;

  // DB counters: fail when used + adding > limit (11th client).
  // Payload counters already pass the would-be total as `count` (`adding` ignored).
  const projected = counter === "nodes" || counter === "blocks" || counter === "tabs" ? used : used + adding;
  if (projected > limit) {
    throw limitReachedError(snapshot.plan, counter, limit);
  }
}

export async function assertTaskAndKnowledgeUploadsAllowed(teamId: string, now = new Date()) {
  const snapshot = await getTeamBilling(teamId, now);
  if (!snapshot.limits.taskAndKnowledgeUploads) {
    throw uploadBlockedError();
  }
}
```

For `nodes`/`blocks`/`tabs`, `used` **is** the proposed total (`count > limit` fails). Do not add `adding` on top.

- [ ] **Step 4: Run tests**

Run: `bun test packages/api/src/billing-team.test.ts`

Expected: PASS (including existing Slice 1 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/billing-team.ts packages/api/src/billing-team.test.ts
git commit -m "$(cat <<'EOF'
feat(billing): enforce Agency volume caps in assertWithinLimit

EOF
)"
```

---

### Task 2: Wire client and project creates

**Files:**
- Modify: `packages/api/src/routers/agency-ops/clients/service.ts` — `createAgencyClient` after `requireAgencyRole`
- Modify: `packages/api/src/routers/agency-ops/projects/service.ts` — `createAgencyProject` (plain insert path) and `createAgencyProjectWithJourney`
- Modify: `packages/api/src/billing-team.test.ts` — service-level 11th client / 31st project / journey-over-task-cap

**Interfaces:**
- Consumes: `assertWithinLimit` from Task 1
- Produces: create RPCs throw `limit_reached` before insert; journey asserts `projects` then `tasksPerProject` with `adding: milestones.length + 1` (each milestone task + journey_anchor). Do not create a truncated project.

- [ ] **Step 1: Failing tests** (in `billing-team.test.ts` or next to existing client integration tests)

```ts
test("createAgencyClient rejects the 11th trial client and does not insert it", async () => {
  const ownerId = await createFixtureUser();
  const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
  await seedClients(team.id, ownerId, 10);
  await expect(
    clientsService.createAgencyClient(ownerId, { teamId: team.id, name: "Overflow" }),
  ).rejects.toMatchObject({ data: { code: "limit_reached" } });
  const rows = await db.select().from(agencyOpsClient).where(eq(agencyOpsClient.teamId, team.id));
  expect(rows).toHaveLength(10);
  expect(rows.some((row) => row.name === "Overflow")).toBe(false);
});
```

Add the same shape for:
- `createAgencyProject` with 30 live projects → 31st named overflow not inserted
- `createAgencyProjectWithJourney` with **2 milestones** on trial (`adding` would be 3) → `limit_reached`, **zero** projects for that team with the requested name

- [ ] **Step 2: FAIL** — `bun test packages/api/src/billing-team.test.ts` (or the file you added)

- [ ] **Step 3: Implementation**

`createAgencyClient` immediately after `requireAgencyRole`:

```ts
await assertWithinLimit(input.teamId, "clients");
```

`createAgencyProject` plain path after `requireAgencyRole` / client lookup:

```ts
await assertWithinLimit(input.teamId, "projects");
```

`createAgencyProjectWithJourney` after membership + milestone validation, **before** `db.transaction`:

```ts
await assertWithinLimit(input.teamId, "projects");
await assertWithinLimit(input.teamId, "tasksPerProject", {
  projectId,
  adding: input.milestones.length + 1,
});
```

`projectId` is already allocated before the transaction (`createWorkspaceId("agency-project")`). Keep that order: allocate id, assert, then insert.

Imports: `assertWithinLimit` from `packages/api/src/billing-team.ts` (relative from the service file).

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(agency): block client and project creates at plan caps

EOF
)"
```

---

### Task 3: Wire task create (new titles only)

**Files:**
- Modify: `packages/api/src/routers/agency-ops/tasks/service.ts` — `createAgencyProjectTask`
- Modify: `packages/api/src/billing-team.test.ts` (or `packages/api/src/routers/agency-ops/tasks/service.integration.test.ts`)

**Interfaces:**
- Consumes: `assertWithinLimit(..., "tasksPerProject", { projectId })`
- Produces: a **new** task title at cap throws `limit_reached` and does not insert. Reusing an existing title (merge assignees) does **not** call the cap (not a new row).

- [ ] **Step 1: Failing tests**

```ts
test("createAgencyProjectTask rejects the 3rd trial task and does not insert it", async () => {
  // seed team + client + project + 2 tasks the same way as Task 1
  await expect(
    tasksService.createAgencyProjectTask(ownerId, {
      teamId: team.id,
      projectId: project.id,
      title: "Overflow",
    }),
  ).rejects.toMatchObject({ data: { code: "limit_reached" } });
  const rows = await db
    .select()
    .from(agencyOpsProjectTask)
    .where(eq(agencyOpsProjectTask.projectId, project.id));
  expect(rows).toHaveLength(2);
});

test("createAgencyProjectTask title merge at cap does not throw", async () => {
  // 2 tasks including title "Alpha"
  await expect(
    tasksService.createAgencyProjectTask(ownerId, {
      teamId: team.id,
      projectId: project.id,
      title: "Alpha",
    }),
  ).resolves.toMatchObject({ title: "Alpha" });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implementation**

In `createAgencyProjectTask`, after title trim / member checks, **only on the new-insert path** (after `findProjectTaskByTitleKey` returns null), before `db.transaction`:

```ts
await assertWithinLimit(input.teamId, "tasksPerProject", { projectId: input.projectId });
```

Do not assert on the merge-existing branch.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(agency): block new project tasks at the per-project cap

EOF
)"
```

---

### Task 4: Canvas leftover/trial node, block, and tab caps

**Files:**
- Modify: `packages/api/src/routers/workspace/service.ts` — `assertCanSaveWorkspaceNodes`
- Create: `packages/api/src/routers/workspace/save-limits.test.ts` if billing-team tests cannot import workspace save without pulling Polar. Prefer extending `packages/api/src/billing-team.test.ts` **only** if `assertCanSaveWorkspaceNodes` is already exported (it is).

**Interfaces:**
- Consumes: `assertWithinLimit` with `count`; `getTeamBilling` via that helper
- Produces: `assertCanSaveWorkspaceNodes(actorUserId, { nodes: WorkspaceNode[] })` (replace `{ nodeCount: number }`)

Resolution of `teamId` (locked):

1. `workspace_team.createdByUserId = actorUserId` (one Agency) → that id
2. else first `workspace_team_member` row for the actor
3. else skip team caps (no Agency yet — should not happen after Slice 1 signup)

Do **not** call `assertAgencyEntitled` here. Leftover must still save up to 3 nodes.

Replace Polar `getBillingStateForUser` inside `assertCanSaveWorkspaceNodes`. Leave marketplace publish gating alone.

- [ ] **Step 1: Failing tests**

```ts
import { assertCanSaveWorkspaceNodes } from "./routers/workspace/service";
import type { WorkspaceNode } from "@orch/workspace";

function stubNode(id: string, tabs: Array<{ blocks: number }>): WorkspaceNode {
  // Build a valid WorkspaceNode via existing test helpers or normalizeWorkspaceNode.
  // Tabs length and blocks.length are the only fields this task asserts.
}

test("leftover save of 4 nodes is limit_reached", async () => {
  const ownerId = await createFixtureUser();
  const team = await teamService.createTeam(ownerId, { name: "Canvas Agency" });
  await db
    .update(workspaceTeamBilling)
    .set({ trialEndsAt: new Date("2026-01-01T00:00:00.000Z") })
    .where(eq(workspaceTeamBilling.teamId, team.id));
  const now = new Date("2026-12-01T00:00:00.000Z");
  const nodes = [0, 1, 2, 3].map((i) => stubNode(`n${i}`, [{ blocks: 1 }]));
  await expect(assertCanSaveWorkspaceNodes(ownerId, { nodes, now })).rejects.toMatchObject({
    data: { code: "limit_reached" },
    message: "This agency can have 3 workspace nodes on leftover. Subscribe to add more.",
  });
});

test("leftover save of 3 nodes with 2 blocks is allowed", async () => {
  // same leftover team
  const nodes = [0, 1, 2].map((i) => stubNode(`n${i}`, [{ blocks: 2 }]));
  await expect(assertCanSaveWorkspaceNodes(ownerId, { nodes, now })).resolves.toBeUndefined();
});

test("leftover save with 3 blocks on one tab is limit_reached", async () => {
  const nodes = [stubNode("n1", [{ blocks: 3 }])];
  await expect(assertCanSaveWorkspaceNodes(ownerId, { nodes, now })).rejects.toMatchObject({
    message: "This agency can have 2 blocks per tab on leftover. Subscribe to add more.",
  });
});

test("trial save with 2 tabs on one node is limit_reached", async () => {
  const ownerId = await createFixtureUser();
  const team = await teamService.createTeam(ownerId, { name: "Trial Canvas" });
  const nodes = [stubNode("n1", [{ blocks: 1 }, { blocks: 1 }])];
  await expect(assertCanSaveWorkspaceNodes(ownerId, { nodes })).rejects.toMatchObject({
    message: "This agency can have 1 tab per node on the trial. Subscribe to add more.",
  });
});
```

`assertCanSaveWorkspaceNodes` must accept optional `now` so leftover tests do not depend on wall clock. Thread `now` into `assertWithinLimit`.

Router today:

```ts
await assertCanSaveWorkspaceNodes(context.session.user.id, { nodeCount: input.nodes.length });
```

Change to:

```ts
await assertCanSaveWorkspaceNodes(context.session.user.id, { nodes: input.nodes });
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implementation**

```ts
export async function assertCanSaveWorkspaceNodes(
  actorUserId: string,
  input: { nodes: WorkspaceNode[]; now?: Date },
) {
  const teamId = await resolveActorAgencyTeamId(actorUserId);
  if (!teamId) return;

  const now = input.now;
  await assertWithinLimit(teamId, "nodes", { count: input.nodes.length, now });

  let maxTabs = 0;
  let maxBlocks = 0;
  for (const node of input.nodes) {
    const tabs = node.tabs ?? [];
    if (tabs.length > maxTabs) maxTabs = tabs.length;
    for (const tab of tabs) {
      const blockCount = tab.blocks?.length ?? 0;
      if (blockCount > maxBlocks) maxBlocks = blockCount;
    }
  }
  await assertWithinLimit(teamId, "tabs", { count: maxTabs, now });
  await assertWithinLimit(teamId, "blocks", { count: maxBlocks, now });
}

async function resolveActorAgencyTeamId(actorUserId: string): Promise<string | null> {
  const [owned] = await db
    .select({ id: workspaceTeam.id })
    .from(workspaceTeam)
    .where(eq(workspaceTeam.createdByUserId, actorUserId))
    .limit(1);
  if (owned) return owned.id;
  const [member] = await db
    .select({ teamId: workspaceTeamMember.teamId })
    .from(workspaceTeamMember)
    .where(eq(workspaceTeamMember.userId, actorUserId))
    .limit(1);
  return member?.teamId ?? null;
}
```

Import `workspaceTeam` if not already imported in this file. Remove unused `getBillingStateForUser` from this function (keep the import only if other functions in the file still need it).

- [ ] **Step 4: PASS** — also `bun test packages/api/src/routers/workspace/service.integration.test.ts` if it exists and covers save

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(canvas): cap leftover and trial nodes, tabs, and blocks

EOF
)"
```

---

### Task 5: Block task and knowledge uploads on trial/leftover

**Files:**
- Modify: `apps/server/src/lib/task-attachments.ts`
- Modify: `apps/server/src/lib/knowledge-sources.ts`
- Create: `apps/server/src/lib/task-attachments.upload-guard.test.ts` (or add tests next to existing server tests). If Hono route tests are heavy, test a extracted helper:

```ts
export async function assertAgencyFileUploadAllowed(teamId: string) {
  await assertTaskAndKnowledgeUploadsAllowed(teamId);
}
```

in `packages/api/src/billing-team.ts` (already Task 1) and keep this task as wiring + HTTP mapping.

**Interfaces:**
- Consumes: `assertTaskAndKnowledgeUploadsAllowed`
- Produces: POST `/uploads/task-attachments` and `/uploads/knowledge-sources` return **403** `{ error: "<locked upload message>", code: "upload_blocked" }` on trial/leftover **before** S3 put. Paid Agency still uses `MAX_UPLOAD_BYTES = 50 * 1024 * 1024` → **400** `"File size must be under 50MB"` when `file.size` is `50 * 1024 * 1024 + 1`. Avatars unchanged.

- [ ] **Step 1: Failing tests**

Prefer unit-testing the JSON mapper plus Task 1’s `assertTaskAndKnowledgeUploadsAllowed`. Add a small helper used by both routes:

```ts
import { ORPCError } from "@orpc/server";
import { assertTaskAndKnowledgeUploadsAllowed } from "@orch/api/billing-team"; // or relative from packages/api — match existing server import style (`@orch/api/...`)

export async function rejectIfUploadsBlocked(teamId: string): Promise<
  | { ok: true }
  | { ok: false; status: 403; body: { error: string; code: "upload_blocked" } }
> {
  try {
    await assertTaskAndKnowledgeUploadsAllowed(teamId);
    return { ok: true };
  } catch (error) {
    if (error instanceof ORPCError && error.code === "FORBIDDEN") {
      const data = error.data as { code?: string } | undefined;
      if (data?.code === "upload_blocked") {
        return {
          ok: false,
          status: 403,
          body: { error: error.message, code: "upload_blocked" },
        };
      }
    }
    throw error;
  }
}
```

Put `rejectIfUploadsBlocked` in `packages/api/src/billing-uploads.ts` (new file) **or** next to the Hono routes if that avoids a new golden inventory row. Prefer **one new file** `packages/api/src/billing-uploads.ts` only if both routes would otherwise duplicate the mapper; otherwise inline the try/catch in each route (duplication of ~15 lines is acceptable — do not build a framework).

Test the 403 mapping with a real trial team id (DB) by calling `rejectIfUploadsBlocked` or hitting the helper.

Also assert paid `50 * 1024 * 1024 + 1` still hits the existing size branch (keep the constant; add a tiny pure test if the size check is extracted; otherwise document in the report that the existing `if (file.size > MAX_UPLOAD_BYTES)` line is unchanged and covered by reading the route).

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implementation**

In both upload routes, after `teamId` / `file` validation and **before** S3:

```ts
try {
  await assertTaskAndKnowledgeUploadsAllowed(teamId);
} catch (error) {
  if (error instanceof ORPCError && error.code === "FORBIDDEN") {
    const data = error.data as { code?: string } | undefined;
    if (data?.code === "upload_blocked") {
      return c.json({ error: error.message, code: "upload_blocked" }, 403);
    }
  }
  throw error;
}
```

Do **not** wrap avatar routes. Keep 50 MB check as 400.

If `@orch/api/billing-team` is not an exported package path, import from the same style other server files use for API modules (see `createContext` from `@orch/api/context`). Add an export in `packages/api` package.json `exports` only if the import cannot resolve — do not add a barrel of Polar types.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(uploads): block task and knowledge files on trial and leftover

EOF
)"
```

---

### Task 6: Slice 2 verification

- [ ] **Step 1:** `bun test packages/api/src/billing-team.test.ts` (and any new test files this slice added)
- [ ] **Step 2:** `bun run check-types`
- [ ] **Step 3:** `bun run check:conventions`
- [ ] **Step 4:** `bun run check:golden` if new in-scope files were added; update `docs/golden-file-source-inventory.md` the same way Slice 1 did for `billing-team.ts`
- [ ] **Step 5:** `bun run check` — if it fails only on the pre-existing unrelated views, record that in the report and do not churn those files
- [ ] **Step 6:** Manual / integration already in tests: trial 11th client, leftover 4th node, trial upload 403, paid 50MB+1 still rejected. Browser smoke is optional; do not block the slice on Google login.

Commit inventory-only changes if Step 4 requires them:

```bash
git commit -m "$(cat <<'EOF'
chore: inventory Slice 2 billing cap files

EOF
)"
```

---

## Later slices (do not implement here)

- Slice 3: Polar quantity = seats; invite checkout; Orch included + packs; `members` / `orchMessages` counters; delete `any active subscription = Pro` fallback
- Slice 4: editor client record / projects / tasks; viewer live timer; `FORBIDDEN` for roles; money scoreboard owner
- Slice 5: Polar slugs `agency` / `agency-unlimited`; landing table; drop Pro copy

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| `assertWithinLimit` clients/projects/tasks/nodes/blocks/tabs | 1–4 |
| Trial 11 / 31 / 3rd task fail | 1–3 |
| Agency 101 / 301 / 51 fail; Unlimited does not | 1 (clients + same helper; projects/tasks limits via AGENCY_PLAN_LIMITS) |
| Leftover canvas 3 nodes / 2 blocks | 1, 4 |
| Over-limit does not truncate | 2–3 |
| Uploads 403 trial/leftover | 1, 5 |
| Paid 50 MB+1 rejected | 5 (existing size check) |
| Avatars leftover allowed | 5 (do not touch avatar routes) |
| Locked cap / upload copy | 1 |
| Seats, Orch packs, Polar slugs, editor RBAC | later slices |
