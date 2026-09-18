import {
  WORKSPACE_SALES_FORECAST_BUCKETS,
  createWorkspaceForecastConfidenceItem,
  getForecastConfidenceBoardSummary,
  getForecastDealWeightedValue,
  workspaceSalesForecastBucketLabels,
  type WorkspaceForecastConfidenceBoardBlock,
  type WorkspaceSalesForecastBucket,
} from "@orch/workspace";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  ListTodo,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { BlockSlider } from "@/features/workspace/node/blocks/shared/block-slider";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

function formatAmount(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function toCurrencyValue(value: string, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.min(1_000_000_000, Math.round(numeric)));
}

function getBucketClasses(bucket: WorkspaceSalesForecastBucket) {
  switch (bucket) {
    case "commit":
      return {
        column: "border-success/10 bg-success/5",
        text: "text-success",
        icon: Award,
      };
    case "likely":
      return {
        column: "border-primary/10 bg-primary/5",
        text: "text-primary",
        icon: TrendingUp,
      };
    case "upside":
      return {
        column: "border-warning/10 bg-warning/5",
        text: "text-warning",
        icon: Sparkles,
      };
    case "at-risk":
      return {
        column: "border-destructive/10 bg-destructive/5",
        text: "text-destructive",
        icon: AlertTriangle,
      };
    default: {
      const _exhaustive: never = bucket;
      return _exhaustive;
    }
  }
}

function getCoverageTextClasses(coverage: number) {
  if (coverage >= 100) {
    return "text-success";
  }
  if (coverage >= 70) {
    return "text-warning";
  }
  return "text-destructive";
}

export function WorkspaceForecastConfidenceBoardBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceForecastConfidenceBoardBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<WorkspaceSalesForecastBucket | null>(null);

  const summary = useMemo(() => getForecastConfidenceBoardSummary(block), [block]);

  const dealsByBucket = useMemo(
    () =>
      Object.fromEntries(
        WORKSPACE_SALES_FORECAST_BUCKETS.map((bucket) => [
          bucket,
          block.deals
            .filter((deal) => deal.bucket === bucket)
            .sort(
              (left, right) => right.confidence - left.confidence || right.valueEgp - left.valueEgp,
            ),
        ]),
      ) as Record<WorkspaceSalesForecastBucket, WorkspaceForecastConfidenceBoardBlock["deals"]>,
    [block.deals],
  );

  const bucketSummaryById = useMemo(
    () => new Map(summary.bucketSummaries.map((entry) => [entry.bucket, entry])),
    [summary.bucketSummaries],
  );

  function mutateDeal(
    dealId: string,
    mutator: (deal: WorkspaceForecastConfidenceBoardBlock["deals"][number]) => void,
  ) {
    mutateTypedBlock(tabId, block.id, "forecast-confidence-board", (entry) => {
      const target = entry.deals.find((candidate) => candidate.id === dealId);
      if (!target) {
        return;
      }
      mutator(target);
    });
  }

  function clearDragState() {
    setDraggingDealId(null);
    setDragOverBucket(null);
  }

  function moveDeal(dealId: string, bucket: WorkspaceSalesForecastBucket) {
    mutateDeal(dealId, (deal) => {
      deal.bucket = bucket;
    });
  }

  function addDeal() {
    mutateTypedBlock(tabId, block.id, "forecast-confidence-board", (entry) => {
      entry.deals.unshift(createWorkspaceForecastConfidenceItem());
    });
  }

  function removeDeal(dealId: string) {
    mutateTypedBlock(tabId, block.id, "forecast-confidence-board", (entry) => {
      entry.deals = entry.deals.filter((deal) => deal.id !== dealId);
    });
  }

  function moveDealByOffset(dealId: string, offset: -1 | 1) {
    const currentBucket = block.deals.find((deal) => deal.id === dealId)?.bucket;
    if (!currentBucket) {
      return;
    }

    const currentIndex = WORKSPACE_SALES_FORECAST_BUCKETS.indexOf(currentBucket);
    if (currentIndex === -1) {
      return;
    }

    const nextBucket = WORKSPACE_SALES_FORECAST_BUCKETS[currentIndex + offset];
    if (!nextBucket) {
      return;
    }

    moveDeal(dealId, nextBucket);
  }

  function canMoveDeal(bucket: WorkspaceSalesForecastBucket, offset: -1 | 1) {
    const currentIndex = WORKSPACE_SALES_FORECAST_BUCKETS.indexOf(bucket);
    return (
      currentIndex + offset >= 0 && currentIndex + offset < WORKSPACE_SALES_FORECAST_BUCKETS.length
    );
  }

  function getBucketSummary(bucket: WorkspaceSalesForecastBucket) {
    return (
      bucketSummaryById.get(bucket) ?? {
        bucket,
        label: workspaceSalesForecastBucketLabels[bucket],
        dealCount: 0,
        totalValue: 0,
        weightedValue: 0,
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Commit revenue {formatAmount(summary.commitRevenue)} · Weighted forecast{" "}
          {formatAmount(summary.weightedForecast)} · At-risk {formatAmount(summary.atRiskValue)} ·
          Coverage{" "}
          <span className={getCoverageTextClasses(summary.coveragePercent)}>
            {summary.coveragePercent}%
          </span>
        </p>
        <BlockProgressBar
          className="min-w-24 max-w-48 flex-1"
          value={summary.coveragePercent}
          max={100}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-6 px-1">
        <div className="max-w-md">
          <h3 className="text-base font-semibold text-foreground">Forecast Board</h3>
          <p className="mt-1 text-xs leading-relaxed text-toned">
            Manage your sales pipeline by deal confidence and track performance against targets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3 rounded-xl border border-muted bg-background p-1.5">
            <label className="ml-3 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
              Target
            </label>
            <Input
              type="number"
              value={String(block.targetRevenueEgp)}
              className="w-32 border-0 bg-transparent font-semibold shadow-none focus-visible:ring-0"
              onChange={(event) =>
                mutateTypedBlock(tabId, block.id, "forecast-confidence-board", (entry) => {
                  entry.targetRevenueEgp = toCurrencyValue(event.target.value, 50000);
                })
              }
            />
          </div>

          <Button
            type="button"
            className="rounded-full px-5 py-2.5 font-semibold"
            onClick={addDeal}
          >
            <Plus />
            Add deal
          </Button>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-6">
        <div className="flex gap-6">
          {WORKSPACE_SALES_FORECAST_BUCKETS.map((bucket) => {
            const bucketClasses = getBucketClasses(bucket);
            const BucketIcon = bucketClasses.icon;

            return (
              <section
                key={bucket}
                className={cn(
                  "flex w-[320px] shrink-0 snap-start flex-col rounded-surface border p-surface",
                  bucketClasses.column,
                  dragOverBucket === bucket ? "ring-2 ring-primary/30" : "",
                )}
                onDragOver={(event) => {
                  if (!draggingDealId) {
                    return;
                  }
                  event.preventDefault();
                  if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = "move";
                  }
                  setDragOverBucket(bucket);
                }}
                onDragLeave={(event) => {
                  const currentTarget = event.currentTarget;
                  const nextTarget = event.relatedTarget;
                  if (
                    currentTarget instanceof HTMLElement &&
                    nextTarget instanceof Node &&
                    currentTarget.contains(nextTarget)
                  ) {
                    return;
                  }
                  if (dragOverBucket === bucket) {
                    setDragOverBucket(null);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const dealId =
                    draggingDealId ||
                    event.dataTransfer?.getData("application/x-workspace-forecast-deal") ||
                    "";

                  if (!dealId) {
                    clearDragState();
                    return;
                  }

                  moveDeal(dealId, bucket);
                  clearDragState();
                }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-xl border border-muted bg-background">
                        <BucketIcon className={cn("size-4", bucketClasses.text)} />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.2em] text-toned">
                          {workspaceSalesForecastBucketLabels[bucket]}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-none text-foreground/60">
                          {getBucketSummary(bucket).dealCount} deals
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-baseline justify-between">
                    <p className="text-2xl font-semibold tracking-tight text-foreground">
                      {formatAmount(getBucketSummary(bucket).totalValue)}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-toned">
                      Wgt: {formatAmount(getBucketSummary(bucket).weightedValue)}
                    </p>
                  </div>
                </div>

                <div className="min-h-[400px] flex-1 space-y-3 p-2">
                  {dealsByBucket[bucket].map((deal) => (
                    <article
                      key={deal.id}
                      draggable
                      className={cn(
                        "group relative rounded-surface border border-muted bg-background p-surface",
                        draggingDealId === deal.id
                          ? "pointer-events-none scale-95 opacity-40 grayscale"
                          : "cursor-grab active:cursor-grabbing",
                      )}
                      onDragStart={(event) => {
                        setDraggingDealId(deal.id);
                        if (!event.dataTransfer) {
                          return;
                        }
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData(
                          "application/x-workspace-forecast-deal",
                          deal.id,
                        );
                        event.dataTransfer.setData("text/plain", deal.id);
                      }}
                      onDragEnd={clearDragState}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Input
                            value={deal.clientName}
                            placeholder="Client Name"
                            className="border-0 bg-transparent p-0 text-base font-semibold shadow-none focus-visible:ring-0"
                            onChange={(event) =>
                              mutateDeal(deal.id, (entry) => {
                                entry.clientName = event.target.value.slice(0, 120);
                              })
                            }
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-toned">
                            <Badge variant="secondary" className="rounded-full">
                              {workspaceSalesForecastBucketLabels[deal.bucket]}
                            </Badge>
                            <span>Weighted {formatAmount(getForecastDealWeightedValue(deal))}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-lg"
                            disabled={!canMoveDeal(deal.bucket, -1)}
                            aria-label={`Move ${deal.clientName || "forecast deal"} to the previous bucket`}
                            onClick={() => moveDealByOffset(deal.id, -1)}
                          >
                            <ArrowLeft />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-lg"
                            disabled={!canMoveDeal(deal.bucket, 1)}
                            aria-label={`Move ${deal.clientName || "forecast deal"} to the next bucket`}
                            onClick={() => moveDealByOffset(deal.id, 1)}
                          >
                            <ArrowRight />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-lg hover:text-destructive"
                            aria-label={`Remove ${deal.clientName || "forecast deal"}`}
                            onClick={() => removeDeal(deal.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="ml-1 text-[10px] font-semibold uppercase tracking-widest text-highlighted">
                              Amount
                            </label>
                            <Input
                              type="number"
                              value={String(deal.valueEgp)}
                              className="rounded-xl border-muted bg-background font-semibold"
                              onChange={(event) =>
                                mutateDeal(deal.id, (entry) => {
                                  entry.valueEgp = toCurrencyValue(event.target.value);
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="ml-1 text-[10px] font-semibold uppercase tracking-widest text-highlighted">
                              Close month
                            </label>
                            <Input
                              type="month"
                              value={deal.expectedCloseMonth ?? ""}
                              className="rounded-xl border-muted bg-background"
                              onChange={(event) =>
                                mutateDeal(deal.id, (entry) => {
                                  entry.expectedCloseMonth = event.target.value || null;
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="ml-1 text-[10px] font-semibold uppercase tracking-widest text-highlighted">
                            Owner
                          </label>
                          <div className="relative">
                            <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                            <Input
                              value={deal.owner}
                              placeholder="Owner Name"
                              className="rounded-xl border-muted bg-background pl-9"
                              onChange={(event) =>
                                mutateDeal(deal.id, (entry) => {
                                  entry.owner = event.target.value.slice(0, 120);
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <div className="mb-2 flex items-center justify-between px-1">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-highlighted">
                              Confidence
                            </span>
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                              {deal.confidence}%
                            </span>
                          </div>
                          <BlockSlider
                            min={10}
                            max={100}
                            step={1}
                            value={deal.confidence}
                            aria-label={`Confidence for ${deal.clientName || "forecast deal"}`}
                            onChange={(event) =>
                              mutateDeal(deal.id, (entry) => {
                                entry.confidence = Math.max(
                                  10,
                                  Math.min(100, Math.round(Number(event.target.value))),
                                );
                              })
                            }
                          />
                        </div>

                        <div className="space-y-1.5 rounded-xl border border-muted bg-background p-3">
                          <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-highlighted">
                            <ListTodo className="size-3" />
                            Next Action
                          </label>
                          <Textarea
                            value={deal.nextAction}
                            placeholder="Define next steps..."
                            rows={1}
                            className="min-h-0 resize-none border-0 bg-transparent p-0 text-[11px] leading-relaxed shadow-none focus-visible:ring-0"
                            onChange={(event) =>
                              mutateDeal(deal.id, (entry) => {
                                entry.nextAction = event.target.value.slice(0, 240);
                              })
                            }
                          />
                        </div>
                      </div>
                    </article>
                  ))}

                  {dealsByBucket[bucket].length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-surface border border-dashed border-muted bg-background p-surface text-center">
                      <p className="text-sm font-semibold text-muted-foreground">
                        No {workspaceSalesForecastBucketLabels[bucket]} deals yet.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-3 rounded-full"
                        onClick={addDeal}
                      >
                        <Plus />
                        Add deal
                      </Button>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
