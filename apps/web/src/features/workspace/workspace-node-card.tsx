import {
  getWorkspaceNodeDashboardDetails,
  getWorkspaceNodePreview,
  getWorkspaceNodeStats,
  type WorkspaceBlock,
  type WorkspaceNode,
} from "@orch/workspace";
import { Layers, Waypoints } from "lucide-react";
import { useMemo } from "react";

import type { CanvasNodeModel } from "@/features/workspace/canvas/canvas-types";
import { getWorkspaceBlockRegistryEntry } from "@/features/workspace/utils/workspace-block-registry";
import { getWorkspaceNodeTintStyle } from "@/features/workspace/utils/workspace-node-dashboard";
import { agentScopeableProps } from "@/features/shared/agent-scopeable";
import { cn } from "@/lib/utils";

type WorkspaceNodeCardProps = {
  node: CanvasNodeModel;
  selected: boolean;
  allNodes?: CanvasNodeModel[];
};

export function WorkspaceNodeCard({
  node,
  selected: _selected,
  allNodes = [],
}: WorkspaceNodeCardProps) {
  const workspaceNode = node as WorkspaceNode;
  const allWorkspaceNodes = allNodes as WorkspaceNode[];

  const featuredDetails = useMemo(
    () => getWorkspaceNodeDashboardDetails(workspaceNode, allWorkspaceNodes),
    [allWorkspaceNodes, workspaceNode],
  );
  const preview = useMemo(
    () => getWorkspaceNodePreview(workspaceNode, featuredDetails.length > 0 ? 120 : 180),
    [featuredDetails.length, workspaceNode],
  );
  const stats = useMemo(
    () => getWorkspaceNodeStats(workspaceNode, allWorkspaceNodes),
    [allWorkspaceNodes, workspaceNode],
  );
  const tintStyle = getWorkspaceNodeTintStyle(workspaceNode.dashboard.tint);

  const outboundConnectionCount =
    workspaceNode.nodeType === "orchestrator" ? workspaceNode.connections.length : 0;
  const linkedOrchestratorCount = allWorkspaceNodes.filter(
    (entry) =>
      entry.nodeType === "orchestrator" &&
      entry.connections.some((connection) => connection.targetNodeId === workspaceNode.id),
  ).length;

  const nodeTypeMeta =
    workspaceNode.nodeType === "orchestrator"
      ? {
          label: "Orchestrator",
          icon: Waypoints,
          accentClass:
            "border-[rgb(var(--workspace-node-rgb)/0.24)] bg-[rgb(var(--workspace-node-rgb)/0.12)] text-[rgb(var(--workspace-node-rgb))]",
          detail:
            outboundConnectionCount === 1
              ? "1 linked node"
              : `${outboundConnectionCount} linked nodes`,
          footer:
            outboundConnectionCount > 0
              ? outboundConnectionCount === 1
                ? "1 linked node"
                : `${outboundConnectionCount} linked nodes`
              : "Ready to coordinate",
        }
      : {
          label: "Standard",
          icon: Layers,
          accentClass: "border-default bg-elevated text-toned",
          detail:
            linkedOrchestratorCount > 0
              ? `Linked to ${linkedOrchestratorCount} orchestrator${linkedOrchestratorCount === 1 ? "" : "s"}`
              : "Standalone",
          footer:
            linkedOrchestratorCount > 0
              ? `Linked to ${linkedOrchestratorCount} orchestrator${linkedOrchestratorCount === 1 ? "" : "s"}`
              : "Standalone",
        };

  const TypeIcon = nodeTypeMeta.icon;

  return (
    <div
      className="node-card group relative flex h-full min-h-0 flex-col overflow-hidden rounded-surface border border-border bg-card p-surface transition-colors duration-200"
      style={tintStyle}
      tabIndex={0}
      {...agentScopeableProps({
        kind: "node",
        id: workspaceNode.id,
        label: workspaceNode.title,
      })}
    >
      <div className="mb-4 flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border",
              nodeTypeMeta.accentClass,
            )}
          >
            <TypeIcon className="size-5" />
          </div>

          <div className="min-w-0">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
                nodeTypeMeta.accentClass,
              )}
            >
              {nodeTypeMeta.label}
            </span>
            <p className="mt-2 text-xs font-semibold text-toned">{nodeTypeMeta.detail}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="rounded-md bg-[rgb(var(--workspace-node-rgb)/0.1)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[rgb(var(--workspace-node-rgb))]">
            {stats.blocksCount} blks
          </div>
          {stats.overdueTasks > 0 ? (
            <div className="rounded-md bg-warning/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">
              Overdue
            </div>
          ) : null}
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-toned">
          {preview}
        </p>

        {featuredDetails.length > 0 ? (
          <div className="space-y-2">
            {featuredDetails.map((detail) => {
              const entry = getWorkspaceBlockRegistryEntry(
                detail.blockType as WorkspaceBlock["type"],
              );
              const DetailIcon = entry.icon;

              return (
                <div
                  key={`${detail.tabId}-${detail.blockId}`}
                  className="rounded-lg bg-primary/5 px-3 py-2"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <DetailIcon className="size-3 shrink-0 text-primary" />
                      <span className="max-w-[120px] truncate text-[10px] font-bold text-highlighted">
                        {detail.blockTitle}
                      </span>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-toned">
                      {detail.tabTitle}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-toned">
                    {detail.summary}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-default pt-3">
        <div className="flex items-center gap-2">
          <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{
                width: `${(stats.completedTasks / (stats.totalTasks || 1)) * 100}%`,
              }}
            />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted">
            {stats.completedTasks}/{stats.totalTasks}
          </span>
        </div>

        <div
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
            nodeTypeMeta.accentClass,
          )}
        >
          {nodeTypeMeta.footer}
        </div>
      </div>
    </div>
  );
}
