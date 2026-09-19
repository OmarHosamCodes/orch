/**
 * Ensure every user has a Legacy Canvas brain and an empty board row.
 * Runs after the 0076 rekey.
 * The SQL migration already rekeys existing dashboard_workspace blobs.
 *
 *   bun run src/operations/backfills/backfill-canvas-named-brains.ts
 *   bun run src/operations/backfills/backfill-canvas-named-brains.ts --dry-run
 */
import { ensureDefaultCanvasWorkspace } from "@orch/api/routers/workspace/canvas-workspace-service";
import { db } from "@orch/db";
import { user } from "@orch/db/schema";

type CliOptions = {
  dryRun: boolean;
  help: boolean;
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

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    console.log("  bun run src/operations/backfills/backfill-canvas-named-brains.ts [--dry-run]");
    return;
  }

  const rows = await db.select({ id: user.id }).from(user);
  if (options.dryRun) {
    console.log(`dry-run would ensure a default Canvas brain for ${rows.length} users`);
    return;
  }

  let ensured = 0;
  for (const row of rows) {
    await ensureDefaultCanvasWorkspace(row.id);
    ensured += 1;
  }
  console.log(`ensured default Canvas brains for ${ensured} users`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
