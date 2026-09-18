/**
 * Read-only acceptance check for a restored Agency clone.
 * Never writes. Point DATABASE_URL at the clone, not production.
 *
 *   bun run --cwd apps/server src/operations/backfills/verify-agency-clone.ts
 *   bun run db:verify:agency-clone -- --expect-users 21 --expect-members 13 --expect-entries 11051
 */
import { sql } from "drizzle-orm";
import { db } from "@orch/db";
import { env } from "@orch/env/server";

const PROTECTED_HOSTS = new Set(["caboose.proxy.rlwy.net", "postgres-eea9.railway.internal"]);

type Expectation = {
  users: number;
  members: number;
  entries: number;
  clientsActive: number;
  projectsLive: number;
  tasks: number;
  activeTimers: number;
};

const DEFAULT_EXPECT: Expectation = {
  users: 21,
  members: 13,
  entries: 11051,
  clientsActive: 22,
  projectsLive: 648,
  tasks: 912,
  activeTimers: 1,
};

function parseIntFlag(argv: string[], name: string, fallback: number): number {
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  const value = argv[index + 1];
  if (!value || !/^\d+$/.test(value)) {
    throw new Error(`${name} requires a non-negative integer`);
  }
  return Number(value);
}

function parseExpect(argv: string[]): Expectation {
  return {
    users: parseIntFlag(argv, "--expect-users", DEFAULT_EXPECT.users),
    members: parseIntFlag(argv, "--expect-members", DEFAULT_EXPECT.members),
    entries: parseIntFlag(argv, "--expect-entries", DEFAULT_EXPECT.entries),
    clientsActive: parseIntFlag(argv, "--expect-clients-active", DEFAULT_EXPECT.clientsActive),
    projectsLive: parseIntFlag(argv, "--expect-projects-live", DEFAULT_EXPECT.projectsLive),
    tasks: parseIntFlag(argv, "--expect-tasks", DEFAULT_EXPECT.tasks),
    activeTimers: parseIntFlag(argv, "--expect-active-timers", DEFAULT_EXPECT.activeTimers),
  };
}

function databaseHost(): string | null {
  try {
    return new URL(env.DATABASE_URL).hostname;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const expect = parseExpect(process.argv.slice(2));
  const host = databaseHost();
  console.log(`Agency clone verification (read-only)\n  DATABASE host: ${host ?? "(unknown)"}\n`);

  if (host && PROTECTED_HOSTS.has(host)) {
    console.error(
      "Refusing to run against a production Postgres host. Point DATABASE_URL at the clone.",
    );
    process.exitCode = 1;
    return;
  }

  const summary = await db.execute<{
    users: string;
    members: string;
    entries: string;
    clients_active: string;
    projects_live: string;
    tasks: string;
    active_timers: string;
    members_missing_onboarding: string;
    billing_rows: string;
    owner_lifetime_pro: boolean | null;
    billing_plan: string | null;
  }>(sql`
    SELECT
      (SELECT count(*)::text FROM "user") AS users,
      (SELECT count(*)::text FROM workspace_team_member) AS members,
      (SELECT count(*)::text FROM agency_ops_time_entry WHERE deleted_at IS NULL) AS entries,
      (SELECT count(*)::text FROM agency_ops_client WHERE archived_at IS NULL) AS clients_active,
      (SELECT count(*)::text FROM agency_ops_project WHERE deleted_at IS NULL) AS projects_live,
      (SELECT count(*)::text FROM agency_ops_project_task) AS tasks,
      (SELECT count(*)::text FROM agency_ops_active_timer) AS active_timers,
      (SELECT count(*)::text
         FROM workspace_team_member m
         JOIN "user" u ON u.id = m.user_id
        WHERE u.onboarding_completed_at IS NULL) AS members_missing_onboarding,
      (SELECT count(*)::text FROM workspace_team_billing) AS billing_rows,
      (SELECT u.lifetime_pro
         FROM workspace_team t
         JOIN "user" u ON u.id = t.created_by_user_id
        LIMIT 1) AS owner_lifetime_pro,
      (SELECT b.plan
         FROM workspace_team_billing b
        LIMIT 1) AS billing_plan
  `);

  const row = summary.rows[0];
  if (!row) {
    throw new Error("Verification query returned no rows");
  }

  const checks: Array<{ name: string; ok: boolean; detail: string }> = [
    {
      name: "users",
      ok: Number(row.users) === expect.users,
      detail: `${row.users} (expect ${expect.users})`,
    },
    {
      name: "members",
      ok: Number(row.members) === expect.members,
      detail: `${row.members} (expect ${expect.members})`,
    },
    {
      name: "live time entries",
      ok: Number(row.entries) === expect.entries,
      detail: `${row.entries} (expect ${expect.entries})`,
    },
    {
      name: "active clients",
      ok: Number(row.clients_active) === expect.clientsActive,
      detail: `${row.clients_active} (expect ${expect.clientsActive})`,
    },
    {
      name: "live projects",
      ok: Number(row.projects_live) === expect.projectsLive,
      detail: `${row.projects_live} (expect ${expect.projectsLive})`,
    },
    {
      name: "tasks",
      ok: Number(row.tasks) === expect.tasks,
      detail: `${row.tasks} (expect ${expect.tasks})`,
    },
    {
      name: "active timers",
      ok: Number(row.active_timers) === expect.activeTimers,
      detail: `${row.active_timers} (expect ${expect.activeTimers})`,
    },
    {
      name: "members onboarded",
      ok: Number(row.members_missing_onboarding) === 0,
      detail: `${row.members_missing_onboarding} missing onboarding_completed_at`,
    },
    {
      name: "team billing row",
      ok: Number(row.billing_rows) >= 1,
      detail: `${row.billing_rows} (plan ${row.billing_plan ?? "none"})`,
    },
    {
      name: "owner lifetime_pro",
      ok: row.owner_lifetime_pro === true,
      detail: String(row.owner_lifetime_pro),
    },
  ];

  const members = await db.execute<{ email: string; role: string }>(sql`
    SELECT u.email, m.role
    FROM workspace_team_member m
    JOIN "user" u ON u.id = m.user_id
    ORDER BY u.email
  `);

  console.log("── Counts ──");
  let failed = 0;
  for (const check of checks) {
    const mark = check.ok ? "OK" : "FAIL";
    if (!check.ok) failed += 1;
    console.log(`  ${mark}  ${check.name}: ${check.detail}`);
  }

  console.log("\n── Members ──");
  for (const member of members.rows) {
    console.log(`  ${member.email}\t${member.role}`);
  }

  if (failed > 0) {
    console.error(`\nFAIL — ${failed} check(s) failed`);
    process.exitCode = 1;
    return;
  }

  console.log("\nOK — clone matches expected Agency membership and data");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
