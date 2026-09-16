import {
  createWorkspaceDealScoringDeal,
  getDealScoreTone,
  getDealScoringMatrixSummary,
  sortDealScoringDeals,
  workspaceSalesPipelineStageLabels,
  workspaceSalesTemperatureLabels,
  type WorkspaceDealScoringMatrixBlock,
  type WorkspaceSalesPipelineStage,
  type WorkspaceSalesTemperature,
} from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockFieldLabel } from "@/features/workspace/node/blocks/shared/block-field-label";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { BlockSlider } from "@/features/workspace/node/blocks/shared/block-slider";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { cn } from "@/lib/utils";

const temperatureOptions = [
  { label: workspaceSalesTemperatureLabels.hot, value: "hot" },
  { label: workspaceSalesTemperatureLabels.warm, value: "warm" },
  { label: workspaceSalesTemperatureLabels.cold, value: "cold" },
] satisfies Array<{ label: string; value: WorkspaceSalesTemperature }>;

const stageOptions = (["lead", "consultation", "proposal", "negotiation", "closed"] as const).map(
  (stage) => ({
    label: workspaceSalesPipelineStageLabels[stage],
    value: stage,
  }),
) satisfies Array<{ label: string; value: WorkspaceSalesPipelineStage }>;

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

function clampScore(value: string) {
  const numeric = Number(value || 0);
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function getScoreTextClasses(score: number) {
  switch (getDealScoreTone(score)) {
    case "strong":
      return "text-success";
    case "medium":
      return "text-warning";
    default:
      return "text-destructive";
  }
}

export function WorkspaceDealScoringMatrixBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceDealScoringMatrixBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getDealScoringMatrixSummary(block), [block]);
  const sortedDeals = useMemo(() => sortDealScoringDeals(block.deals), [block.deals]);
  const advancedStageCount = useMemo(
    () =>
      summary.stageCounts.proposal + summary.stageCounts.negotiation + summary.stageCounts.closed,
    [summary.stageCounts],
  );
  const topDeal = sortedDeals[0] ?? null;

  function mutateDeal(
    dealId: string,
    mutator: (deal: WorkspaceDealScoringMatrixBlock["deals"][number]) => void,
  ) {
    mutateTypedBlock(tabId, block.id, "deal-scoring-matrix", (entry) => {
      const target = entry.deals.find((candidate) => candidate.id === dealId);

      if (!target) {
        return;
      }

      mutator(target);
    });
  }

  function addDeal() {
    mutateTypedBlock(tabId, block.id, "deal-scoring-matrix", (entry) => {
      entry.deals.unshift(createWorkspaceDealScoringDeal());
    });
  }

  function removeDeal(dealId: string) {
    mutateTypedBlock(tabId, block.id, "deal-scoring-matrix", (entry) => {
      entry.deals = entry.deals.filter((deal) => deal.id !== dealId);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="text-sm font-semibold text-foreground">Deal priority stack</p>
          <p className="text-sm text-toned">
            Deals are automatically ranked by score so the best opportunities stay at the top.
          </p>
          <p className="mt-1 text-xs text-toned">
            {formatAmount(summary.totalValue)} pipeline · avg score {summary.averageScore} ·{" "}
            {summary.hotCount} hot · {advancedStageCount} advanced
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {topDeal ? (
            <Badge variant="secondary" className="rounded-full">
              Top deal: {topDeal.clientName || "Untitled deal"}
            </Badge>
          ) : null}

          {sortedDeals.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              className="rounded-full px-4"
              onClick={addDeal}
            >
              <Plus />
              Add Deal
            </Button>
          ) : null}
        </div>
      </div>

      {sortedDeals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            Add a deal to start ranking the pipeline.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 rounded-full px-4"
            onClick={addDeal}
          >
            <Plus />
            Add
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDeals.map((deal, index) => (
            <article
              key={deal.id}
              className="rounded-surface border border-muted bg-background p-surface"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Input
                    value={deal.clientName}
                    placeholder="Client name"
                    className="w-full border-0 bg-transparent px-0 text-lg font-semibold text-foreground placeholder:text-muted shadow-none focus-visible:ring-0"
                    onChange={(event) =>
                      mutateDeal(deal.id, (target) => {
                        target.clientName = event.target.value.slice(0, 120);
                      })
                    }
                  />

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      #{index + 1} in stack
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {workspaceSalesTemperatureLabels[deal.temperature]}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {workspaceSalesPipelineStageLabels[deal.stage]}
                    </Badge>
                    {deal.dueDate ? (
                      <Badge variant="secondary" className="rounded-full">
                        Due {deal.dueDate}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl hover:text-destructive"
                  aria-label={`Remove ${deal.clientName || "deal"}`}
                  onClick={() => removeDeal(deal.id)}
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>Amount</BlockFieldLabel>
                  </Label>
                  <Input
                    value={String(deal.valueEgp)}
                    type="number"
                    className="w-full rounded-xl"
                    onChange={(event) =>
                      mutateDeal(deal.id, (target) => {
                        target.valueEgp = toCurrencyValue(event.target.value);
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>Temperature</BlockFieldLabel>
                  </Label>
                  <BlockSelect
                    value={deal.temperature}
                    options={temperatureOptions}
                    className="rounded-xl"
                    onValueChange={(value) =>
                      mutateDeal(deal.id, (target) => {
                        target.temperature =
                          value === "hot" || value === "warm" || value === "cold" ? value : "warm";
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>Stage</BlockFieldLabel>
                  </Label>
                  <BlockSelect
                    value={deal.stage}
                    options={stageOptions}
                    className="rounded-xl"
                    onValueChange={(value) =>
                      mutateDeal(deal.id, (target) => {
                        target.stage =
                          value === "lead" ||
                          value === "consultation" ||
                          value === "proposal" ||
                          value === "negotiation" ||
                          value === "closed"
                            ? value
                            : "lead";
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>Due Date</BlockFieldLabel>
                  </Label>
                  <Input
                    value={deal.dueDate ?? ""}
                    type="date"
                    className="w-full rounded-xl"
                    onChange={(event) =>
                      mutateDeal(deal.id, (target) => {
                        target.dueDate = event.target.value || null;
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
                  <span>Score</span>
                  <span className={cn("font-semibold", getScoreTextClasses(deal.score))}>
                    {deal.score}
                  </span>
                </div>
                <BlockSlider
                  value={deal.score}
                  min={0}
                  max={100}
                  step={1}
                  aria-label={`Score for ${deal.clientName || "deal"}`}
                  onChange={(event) =>
                    mutateDeal(deal.id, (target) => {
                      target.score = clampScore(event.target.value);
                    })
                  }
                />
              </div>

              <div className="mt-5 space-y-1.5">
                <Label>
                  <BlockFieldLabel>Next Action</BlockFieldLabel>
                </Label>
                <Input
                  value={deal.nextAction}
                  className="w-full rounded-xl"
                  placeholder="What needs to happen next?"
                  onChange={(event) =>
                    mutateDeal(deal.id, (target) => {
                      target.nextAction = event.target.value.slice(0, 240);
                    })
                  }
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
