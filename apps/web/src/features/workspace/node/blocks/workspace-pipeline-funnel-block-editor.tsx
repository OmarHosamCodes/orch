import {
  WORKSPACE_SALES_PIPELINE_STAGES,
  createWorkspacePipelineFunnelDeal,
  getPipelineFunnelSummary,
  getSalesPipelineStageIndex,
  workspaceSalesPipelineStageLabels,
  type WorkspacePipelineFunnelBlock,
  type WorkspaceSalesPipelineStage,
} from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { cn } from "@/lib/utils";

const stageOptions = WORKSPACE_SALES_PIPELINE_STAGES.map((stage) => ({
  label: workspaceSalesPipelineStageLabels[stage],
  value: stage,
}));

function formatAmount(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function toCurrencyValue(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(1_000_000_000, Math.round(numeric)));
}

function getStageRowClasses(stage: WorkspaceSalesPipelineStage) {
  switch (stage) {
    case "lead":
      return "border-primary/30 bg-primary/5";
    case "consultation":
      return "border-info/30 bg-info/5";
    case "proposal":
      return "border-warning/35 bg-warning/5";
    case "negotiation":
      return "border-secondary/35 bg-secondary/8";
    case "closed":
      return "border-success/35 bg-success/5";
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

export function WorkspacePipelineFunnelBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspacePipelineFunnelBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getPipelineFunnelSummary(block), [block]);

  const sortedDeals = useMemo(
    () =>
      [...block.deals].sort((left, right) => {
        const stageDelta =
          getSalesPipelineStageIndex(left.stage) - getSalesPipelineStageIndex(right.stage);
        if (stageDelta !== 0) {
          return stageDelta;
        }
        return right.valueEgp - left.valueEgp;
      }),
    [block.deals],
  );

  function addDeal() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "pipeline-funnel") {
        return;
      }
      entry.deals.unshift(createWorkspacePipelineFunnelDeal());
    });
  }

  function removeDeal(dealId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "pipeline-funnel") {
        return;
      }
      entry.deals = entry.deals.filter((deal) => deal.id !== dealId);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Sales Pipeline Funnel
          </h2>
          <p className="text-xs text-toned">Track deal progression and conversion at each stage.</p>
          <p className="mt-1 text-xs text-toned">
            {formatAmount(summary.totalValue)} pipeline · {formatAmount(summary.openValue)} open ·{" "}
            {formatAmount(summary.closedValue)} closed · {summary.stageSummaries[0]?.dealCount ?? 0}{" "}
            leads
          </p>
        </div>

        {sortedDeals.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={addDeal}
          >
            <Plus />
            Add Deal
          </Button>
        ) : null}
      </div>

      <div className="rounded-surface border border-muted bg-background p-surface">
        <div className="space-y-2.5">
          {summary.stageSummaries.map((stage) => (
            <div key={stage.stage} className="flex justify-center">
              <div
                className={cn(
                  "w-full rounded-xl border px-4 py-3 transition-colors",
                  getStageRowClasses(stage.stage),
                )}
                style={{ width: `${stage.widthPercent}%` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
                      {stage.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {stage.dealCount} deal{stage.dealCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <p className="font-mono text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {formatAmount(stage.totalValue)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 px-1">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Deals</h3>
          <p className="text-xs text-toned">Update stage and value directly from the list.</p>
        </div>

        {sortedDeals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-muted bg-background py-10 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              Add a deal to build the funnel.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4 rounded-full"
              onClick={addDeal}
            >
              <Plus />
              Add
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDeals.map((deal) => (
              <article
                key={deal.id}
                className="rounded-surface border border-muted bg-background p-surface"
              >
                <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
                  <div className="min-w-0">
                    <Input
                      value={deal.clientName}
                      placeholder="Client name"
                      className="border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0"
                      onChange={(event) =>
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== "pipeline-funnel") {
                            return;
                          }
                          const target = entry.deals.find((candidate) => candidate.id === deal.id);
                          if (!target) {
                            return;
                          }
                          target.clientName = event.target.value.slice(0, 120);
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor={`value-${deal.id}`}
                      className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-toned"
                    >
                      Amount
                    </Label>
                    <Input
                      id={`value-${deal.id}`}
                      type="number"
                      value={String(deal.valueEgp)}
                      className="rounded-xl font-mono"
                      onChange={(event) =>
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== "pipeline-funnel") {
                            return;
                          }
                          const target = entry.deals.find((candidate) => candidate.id === deal.id);
                          if (!target) {
                            return;
                          }
                          target.valueEgp = toCurrencyValue(event.target.value);
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor={`stage-${deal.id}`}
                      className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-toned"
                    >
                      Stage
                    </Label>
                    <BlockSelect
                      id={`stage-${deal.id}`}
                      value={deal.stage}
                      options={stageOptions}
                      className="rounded-xl"
                      aria-label="Deal stage"
                      onValueChange={(value) =>
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== "pipeline-funnel") {
                            return;
                          }
                          const target = entry.deals.find((candidate) => candidate.id === deal.id);
                          if (!target) {
                            return;
                          }
                          target.stage = value as WorkspaceSalesPipelineStage;
                        })
                      }
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove deal"
                      onClick={() => removeDeal(deal.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
