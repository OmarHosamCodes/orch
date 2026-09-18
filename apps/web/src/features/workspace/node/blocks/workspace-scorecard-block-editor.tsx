import type { WorkspaceScorecardBlock } from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

function toNumber(value: string, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getMetricProgress(value: number, target: number) {
  if (target === 0) {
    return value > 0 ? 100 : 0;
  }
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function getMetricStatus(value: number, target: number) {
  const progress = getMetricProgress(value, target);

  if (progress >= 100) {
    return {
      label: "At target",
      textClass: "text-success",
      badgeVariant: "success" as const,
    };
  }

  if (progress >= 50) {
    return {
      label: "On track",
      textClass: "text-warning",
      badgeVariant: "secondary" as const,
    };
  }

  return {
    label: "Behind",
    textClass: "text-destructive",
    badgeVariant: "destructive" as const,
  };
}

export function WorkspaceScorecardBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceScorecardBlock>) {
  const { addScorecardMetric, mutateScorecardMetric, removeScorecardMetric } =
    useWorkspaceNodeEditorContext();

  const summary = useMemo(() => {
    const metricCount = block.metrics.length;
    const atTarget = block.metrics.filter((metric) => metric.value >= metric.target).length;

    return {
      metricCount,
      atTarget,
    };
  }, [block.metrics]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-48 flex-1 space-y-2">
          <p className="text-sm text-toned">
            {summary.atTarget}/{summary.metricCount} at target
          </p>
          <BlockProgressBar value={summary.atTarget} max={Math.max(summary.metricCount, 1)} />
        </div>
        {block.metrics.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full px-4"
            aria-label="Add scorecard metric"
            onClick={() => addScorecardMetric(tabId, block.id)}
          >
            <Plus />
            Add metric
          </Button>
        ) : null}
      </div>

      {block.metrics.length > 0 ? (
        <div className="space-y-3">
          {block.metrics.map((metric) => {
            const status = getMetricStatus(metric.value, metric.target);
            const progress = getMetricProgress(metric.value, metric.target);

            return (
              <article
                key={metric.id}
                className="space-y-3 rounded-surface border border-muted p-surface"
              >
                <div className="flex items-start justify-between gap-3">
                  <Input
                    value={metric.label}
                    placeholder="Metric title"
                    className="min-w-0 flex-1 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                    aria-label={`Metric title for ${metric.label || "scorecard metric"}`}
                    onChange={(event) =>
                      mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                        entry.label = event.target.value.slice(0, 120);
                      })
                    }
                  />
                  <Badge variant={status.badgeVariant} className="rounded-full">
                    {status.label}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl hover:text-destructive"
                    aria-label={`Remove ${metric.label || "scorecard"} metric`}
                    onClick={() => removeScorecardMetric(tabId, block.id, metric.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input
                    type="number"
                    value={String(metric.value)}
                    className="rounded-xl"
                    aria-label={`Current for ${metric.label || "scorecard metric"}`}
                    onChange={(event) =>
                      mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                        entry.value = toNumber(event.target.value, 0);
                      })
                    }
                  />
                  <Input
                    type="number"
                    value={String(metric.target)}
                    className="rounded-xl"
                    aria-label={`Target for ${metric.label || "scorecard metric"}`}
                    onChange={(event) =>
                      mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                        entry.target = toNumber(event.target.value, 100);
                      })
                    }
                  />
                  <Input
                    type="text"
                    value={metric.unit}
                    placeholder="Unit"
                    className="rounded-xl"
                    aria-label={`Unit for ${metric.label || "scorecard metric"}`}
                    onChange={(event) =>
                      mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                        entry.unit = event.target.value.slice(0, 24);
                      })
                    }
                  />
                </div>

                <div className="flex items-center gap-3">
                  <BlockProgressBar value={progress} max={100} className="flex-1" />
                  <span className={cn("text-sm font-semibold", status.textClass)}>{progress}%</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No metrics yet.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3 rounded-full px-4"
            aria-label="Add first scorecard metric"
            onClick={() => addScorecardMetric(tabId, block.id)}
          >
            <Plus />
            Add metric
          </Button>
        </div>
      )}
    </div>
  );
}
