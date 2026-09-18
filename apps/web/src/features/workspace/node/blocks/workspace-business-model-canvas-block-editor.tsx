import {
  analyzeBusinessModelCanvas,
  getBusinessModelCanvasSummary,
  workspaceBusinessModelCanvasCellLabels,
  type WorkspaceBusinessModelCanvasBlock,
  type WorkspaceBusinessModelCanvasCellKey,
} from "@orch/workspace";
import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
import { formatDateTime } from "@/lib/utils/format-date-time";
import { cn } from "@/lib/utils";

const canvasCells: Array<{
  key: WorkspaceBusinessModelCanvasCellKey;
  area: string;
  placeholder: string;
}> = [
  {
    key: "keyPartners",
    area: "partners",
    placeholder: "Freelancers, tool providers, media partners...",
  },
  {
    key: "keyActivities",
    area: "activities",
    placeholder: "Curriculum design, consulting delivery, content publishing...",
  },
  {
    key: "keyResources",
    area: "resources",
    placeholder: "Brand, curriculum assets, instructor bench, CRM...",
  },
  {
    key: "valuePropositions",
    area: "value",
    placeholder: "Practical outcomes, speed to implementation, trusted guidance...",
  },
  {
    key: "customerRelationships",
    area: "relationships",
    placeholder: "Community, advisory support, office hours, account management...",
  },
  {
    key: "channels",
    area: "channels",
    placeholder: "Content funnel, referrals, sales calls, partnerships...",
  },
  {
    key: "customerSegments",
    area: "segments",
    placeholder: "Founders, senior marketers, in-house teams...",
  },
  {
    key: "costStructure",
    area: "costs",
    placeholder: "Talent, media spend, software, production, delivery costs...",
  },
  {
    key: "revenueStreams",
    area: "revenue",
    placeholder: "Cohorts, retainers, advisory, licensing, workshops...",
  },
];

const gridAreaClass: Record<string, string> = {
  partners: "lg:[grid-area:partners]",
  activities: "lg:[grid-area:activities]",
  resources: "lg:[grid-area:resources]",
  value: "lg:[grid-area:value]",
  relationships: "lg:[grid-area:relationships]",
  channels: "lg:[grid-area:channels]",
  segments: "lg:[grid-area:segments]",
  costs: "lg:[grid-area:costs]",
  revenue: "lg:[grid-area:revenue]",
};

function getReadinessLabel(
  readiness: ReturnType<typeof getBusinessModelCanvasSummary>["readiness"],
) {
  switch (readiness) {
    case "aligned":
      return "Aligned";
    case "forming":
      return "Forming";
    default:
      return "Early";
  }
}

export function WorkspaceBusinessModelCanvasBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceBusinessModelCanvasBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getBusinessModelCanvasSummary(block), [block]);

  function runAnalysis() {
    mutateBlock(tabId, block.id, (entry, _tab, _node, timestamp) => {
      if (entry.type !== "business-model-canvas") {
        return;
      }
      const analysis = analyzeBusinessModelCanvas(entry);
      entry.analysis = analysis.narrative;
      entry.analysisUpdatedAt = timestamp;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Business Model Canvas
          </h2>
          <p className="text-xs text-toned">
            Pressure-test how the model creates, delivers, and captures value.
          </p>
          <p className="mt-1 text-xs text-toned">
            Coverage {summary.filledCellCount}/9 · Missing {summary.missingCellCount} ·{" "}
            {getReadinessLabel(summary.readiness)}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={runAnalysis}
        >
          Analyze gaps
        </Button>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className={cn(
            "grid gap-3 lg:min-w-[1000px] lg:grid-cols-5",
            "lg:[grid-template-areas:'partners_activities_value_relationships_segments'_'partners_resources_value_channels_segments'_'costs_costs_revenue_revenue_revenue']",
          )}
        >
          {canvasCells.map((cell) => (
            <article
              key={cell.key}
              className={cn(
                "rounded-surface border border-muted bg-background p-surface",
                gridAreaClass[cell.area],
              )}
            >
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
                {workspaceBusinessModelCanvasCellLabels[cell.key]}
              </p>

              <Textarea
                value={block.cells[cell.key]}
                rows={cell.key === "costStructure" || cell.key === "revenueStreams" ? 3 : 5}
                className="min-h-24 rounded-xl bg-muted"
                placeholder={block.cells[cell.key].trim() ? "" : cell.placeholder}
                onChange={(event) =>
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== "business-model-canvas") {
                      return;
                    }
                    entry.cells[cell.key] = event.target.value.slice(0, 4000);
                  })
                }
              />
            </article>
          ))}
        </div>
      </div>

      {summary.missingCellCount > 0 ? (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning">Incomplete canvas</p>
              <p className="mt-1 text-xs text-toned">
                {summary.missingCellCount} cell{summary.missingCellCount !== 1 ? "s" : ""} need
                {summary.missingCellCount === 1 ? "s" : ""} attention. Fill all cells for a complete
                model analysis.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {block.analysis ? (
        <section className="rounded-surface border border-muted bg-background p-surface">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Analysis Output
              </h3>
              <p className="mt-0.5 text-xs text-toned">
                Identifies strengths, gaps, and strategic questions.
              </p>
            </div>

            {block.analysisUpdatedAt ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
                Last analyzed {formatDateTime(block.analysisUpdatedAt)}
              </p>
            ) : null}
          </div>

          <div className="mt-3 rounded-surface border border-muted bg-card p-surface text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {block.analysis}
          </div>
        </section>
      ) : null}
    </div>
  );
}
