import { db } from "@orch/db";
import {
  dashboardWorkspace,
  workspaceMarketplaceItem,
  type WorkspaceNodeRecord,
} from "@orch/db/schema/workspace";
import { eq } from "drizzle-orm";

const LEGACY_AGENCY_OPERATOR_NODE_TYPE = "agency-operator";

type CliOptions = {
  dryRun: boolean;
  help: boolean;
};

function parseCliArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let help = false;

  for (const argument of argv) {
    if (!argument) {
      continue;
    }

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

function printUsage() {
  console.log("Usage:");
  console.log("  bun run src/operations/maintenance/cleanup-agency-operator-nodes.ts [--dry-run]");
  console.log("");
  console.log("Root workspace command:");
  console.log("  bun run cleanup:agency-operator-nodes");
  console.log("  bun run cleanup:agency-operator-nodes -- --dry-run");
}

type WorkspaceCleanupResult = {
  userId: string;
  removedNodeIds: string[];
  prunedConnections: number;
  totalNodesBefore: number;
  totalNodesAfter: number;
};

function cleanupWorkspaceNodes(nodes: WorkspaceNodeRecord[]): {
  nextNodes: WorkspaceNodeRecord[];
  removedNodeIds: string[];
  prunedConnections: number;
} {
  const removedNodeIds = new Set<string>();

  for (const node of nodes) {
    const nodeType = (node as { nodeType?: string }).nodeType;

    if (nodeType === LEGACY_AGENCY_OPERATOR_NODE_TYPE) {
      removedNodeIds.add(node.id);
    }
  }

  if (removedNodeIds.size === 0) {
    return { nextNodes: nodes, removedNodeIds: [], prunedConnections: 0 };
  }

  let prunedConnections = 0;

  const nextNodes = nodes
    .filter((node) => !removedNodeIds.has(node.id))
    .map((node) => {
      const connections = (node as { connections?: { targetNodeId: string }[] }).connections;

      if (!Array.isArray(connections) || connections.length === 0) {
        return node;
      }

      const filteredConnections = connections.filter(
        (connection) => !removedNodeIds.has(connection.targetNodeId),
      );

      if (filteredConnections.length === connections.length) {
        return node;
      }

      prunedConnections += connections.length - filteredConnections.length;

      return {
        ...node,
        connections: filteredConnections,
      } as WorkspaceNodeRecord;
    });

  return {
    nextNodes,
    removedNodeIds: [...removedNodeIds],
    prunedConnections,
  };
}

async function cleanupDashboardWorkspaces(dryRun: boolean): Promise<WorkspaceCleanupResult[]> {
  const rows = await db
    .select({
      userId: dashboardWorkspace.ownerUserId,
      workspaceId: dashboardWorkspace.workspaceId,
      nodes: dashboardWorkspace.nodes,
    })
    .from(dashboardWorkspace);

  const results: WorkspaceCleanupResult[] = [];

  for (const row of rows) {
    const nodes = row.nodes ?? [];
    const { nextNodes, removedNodeIds, prunedConnections } = cleanupWorkspaceNodes(nodes);

    if (removedNodeIds.length === 0 && prunedConnections === 0) {
      continue;
    }

    results.push({
      userId: row.userId,
      removedNodeIds,
      prunedConnections,
      totalNodesBefore: nodes.length,
      totalNodesAfter: nextNodes.length,
    });

    if (dryRun) {
      continue;
    }

    await db
      .update(dashboardWorkspace)
      .set({ nodes: nextNodes })
      .where(eq(dashboardWorkspace.workspaceId, row.workspaceId));
  }

  return results;
}

type MarketplaceCleanupResult = {
  id: string;
  title: string;
};

async function cleanupMarketplaceItems(dryRun: boolean): Promise<MarketplaceCleanupResult[]> {
  const rows = await db
    .select({
      id: workspaceMarketplaceItem.id,
      title: workspaceMarketplaceItem.title,
      kind: workspaceMarketplaceItem.kind,
      payload: workspaceMarketplaceItem.payload,
    })
    .from(workspaceMarketplaceItem)
    .where(eq(workspaceMarketplaceItem.kind, "node"));

  const removable: MarketplaceCleanupResult[] = [];

  for (const row of rows) {
    const payload = row.payload as { kind?: string; node?: { nodeType?: string } } | null;

    if (!payload || payload.kind !== "node") {
      continue;
    }

    if (payload.node?.nodeType !== LEGACY_AGENCY_OPERATOR_NODE_TYPE) {
      continue;
    }

    removable.push({ id: row.id, title: row.title });

    if (dryRun) {
      continue;
    }

    await db.delete(workspaceMarketplaceItem).where(eq(workspaceMarketplaceItem.id, row.id));
  }

  return removable;
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const mode = options.dryRun ? "DRY RUN" : "APPLY";
  console.log(`Running agency-operator cleanup (${mode})...`);
  console.log("");

  const workspaceResults = await cleanupDashboardWorkspaces(options.dryRun);

  if (workspaceResults.length === 0) {
    console.log("dashboard_workspace: no agency-operator nodes found.");
  } else {
    console.log(`dashboard_workspace: ${workspaceResults.length} workspace(s) affected.`);
    for (const result of workspaceResults) {
      console.log(
        `  - user=${result.userId} removedNodes=${result.removedNodeIds.length} prunedConnections=${result.prunedConnections} (${result.totalNodesBefore} -> ${result.totalNodesAfter})`,
      );
    }
  }

  console.log("");

  const marketplaceResults = await cleanupMarketplaceItems(options.dryRun);

  if (marketplaceResults.length === 0) {
    console.log("workspace_marketplace_item: no agency-operator node items found.");
  } else {
    console.log(
      `workspace_marketplace_item: ${marketplaceResults.length} item(s) ${options.dryRun ? "would be" : ""} deleted.`,
    );
    for (const result of marketplaceResults) {
      console.log(`  - id=${result.id} title="${result.title}"`);
    }
  }

  console.log("");

  if (options.dryRun) {
    console.log("Dry run complete. Re-run without --dry-run to apply changes.");
  } else {
    console.log("Cleanup complete.");
  }
}

void main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("Cleanup failed.");
    console.error(error);
    process.exit(1);
  });
