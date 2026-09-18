/**
 * Re-match catalog icons on projects and tasks that still use auto assignment.
 * Manual (including Letter) picks are left untouched.
 *
 *   bun run src/operations/backfills/backfill-entity-icons.ts
 *   bun run src/operations/backfills/backfill-entity-icons.ts --dry-run
 */
import { db } from "@orch/db";
import { agencyOpsProject, agencyOpsProjectTask } from "@orch/db/schema";
import { eq } from "drizzle-orm";
import { matchAgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";

type CliOptions = {
  dryRun: boolean;
  help: boolean;
};

type BackfillCounts = {
  scanned: number;
  matched: number;
  changed: number;
};

function parseCliArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let help = false;

  for (const argument of argv) {
    if (!argument) continue;
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument === "--dry-run" || argument === "-n") {
      dryRun = true;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return { dryRun, help };
}

async function backfillProjects(dryRun: boolean): Promise<BackfillCounts> {
  const rows = await db
    .select({
      id: agencyOpsProject.id,
      name: agencyOpsProject.name,
      iconKey: agencyOpsProject.iconKey,
    })
    .from(agencyOpsProject)
    .where(eq(agencyOpsProject.iconSource, "auto"));

  let matched = 0;
  let changed = 0;
  for (const row of rows) {
    const iconKey = matchAgencyEntityIconKey(row.name);
    if (iconKey) matched += 1;
    if (iconKey === row.iconKey) continue;
    changed += 1;
    if (dryRun) continue;
    await db
      .update(agencyOpsProject)
      .set({ iconKey, iconSource: "auto", updatedAt: new Date() })
      .where(eq(agencyOpsProject.id, row.id));
  }

  return { scanned: rows.length, matched, changed };
}

async function backfillTasks(dryRun: boolean): Promise<BackfillCounts> {
  const rows = await db
    .select({
      id: agencyOpsProjectTask.id,
      title: agencyOpsProjectTask.title,
      iconKey: agencyOpsProjectTask.iconKey,
    })
    .from(agencyOpsProjectTask)
    .where(eq(agencyOpsProjectTask.iconSource, "auto"));

  let matched = 0;
  let changed = 0;
  for (const row of rows) {
    const iconKey = matchAgencyEntityIconKey(row.title);
    if (iconKey) matched += 1;
    if (iconKey === row.iconKey) continue;
    changed += 1;
    if (dryRun) continue;
    await db
      .update(agencyOpsProjectTask)
      .set({ iconKey, iconSource: "auto", updatedAt: new Date() })
      .where(eq(agencyOpsProjectTask.id, row.id));
  }

  return { scanned: rows.length, matched, changed };
}

function formatCounts(label: string, counts: BackfillCounts) {
  return `${label} ${counts.matched}/${counts.scanned} matched, ${counts.changed} changed`;
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    console.log("  bun run src/operations/backfills/backfill-entity-icons.ts [--dry-run]");
    return;
  }

  const projects = await backfillProjects(options.dryRun);
  const tasks = await backfillTasks(options.dryRun);
  const prefix = options.dryRun ? "dry-run" : "updated";
  console.log(`${prefix} ${formatCounts("projects", projects)}, ${formatCounts("tasks", tasks)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
