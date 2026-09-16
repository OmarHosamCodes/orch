import {
  WORKSPACE_CONTENT_PLATFORMS,
  WORKSPACE_CONTENT_ROI_SORT_OPTIONS,
  createWorkspaceContentRoiItem,
  getContentRoiScore,
  getContentRoiStatus,
  getContentRoiTrackerSummary,
  sortContentRoiItems,
  workspaceContentPlatformLabels,
  workspaceContentRoiSortLabels,
  workspaceContentRoiStatusLabels,
  type WorkspaceContentPlatform,
  type WorkspaceContentRoiTrackerBlock,
} from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { BlockSlider } from "@/features/workspace/node/blocks/shared/block-slider";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

const rowGridStyle = {
  gridTemplateColumns:
    "minmax(16rem,1.6fr) minmax(8rem,0.8fr) minmax(10rem,1fr) minmax(10rem,1fr) minmax(7rem,0.7fr) minmax(6rem,0.6fr) minmax(12rem,1fr) minmax(12rem,1fr) minmax(18rem,1.4fr) auto",
};

const tableHeaders = [
  "Content",
  "Platform",
  "Campaign",
  "Goal",
  "Reach",
  "Leads",
  "Conversion Influence",
  "Repurpose Value",
  "ROI Status",
  "Actions",
] as const;

const platformOptions = WORKSPACE_CONTENT_PLATFORMS.map((platform) => ({
  label: workspaceContentPlatformLabels[platform],
  value: platform,
}));

function clampInteger(value: string, min: number, max: number) {
  const numeric = Number(value || 0);

  if (!Number.isFinite(numeric)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function toPlatform(value: string): WorkspaceContentPlatform {
  return value === "instagram" || value === "tiktok" || value === "linkedin" || value === "youtube"
    ? value
    : "linkedin";
}

function getStatusClasses(score: number) {
  const status = getContentRoiStatus(score);

  switch (status) {
    case "high-return":
      return "border-success/35 bg-success/5 text-success";
    case "promising":
      return "border-warning/35 bg-warning/5 text-warning";
    default:
      return "border-destructive/35 bg-destructive/5 text-destructive";
  }
}

function getPerformanceSummary(score: number) {
  const status = getContentRoiStatus(score);

  switch (status) {
    case "high-return":
      return "Strong commercial signal with clear lead and repurposing value.";
    case "promising":
      return "Worth iterating further to improve conversion or distribution quality.";
    default:
      return "Needs a sharper angle, better distribution, or a different format.";
  }
}

export function WorkspaceContentRoiTrackerBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceContentRoiTrackerBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getContentRoiTrackerSummary(block), [block]);
  const sortedItems = useMemo(
    () => sortContentRoiItems(block.items, block.sortBy),
    [block.items, block.sortBy],
  );
  const topItem = sortedItems[0] ?? null;
  const promisingCount = useMemo(
    () =>
      block.items.filter((item) => getContentRoiStatus(getContentRoiScore(item)) === "promising")
        .length,
    [block.items],
  );
  const underperformingCount = useMemo(
    () =>
      block.items.filter((item) => getContentRoiStatus(getContentRoiScore(item)) === "low-return")
        .length,
    [block.items],
  );

  function mutateItem(
    itemId: string,
    mutator: (item: WorkspaceContentRoiTrackerBlock["items"][number]) => void,
  ) {
    mutateTypedBlock(tabId, block.id, "content-roi-tracker", (entry) => {
      const target = entry.items.find((candidate) => candidate.id === itemId);
      if (!target) {
        return;
      }
      mutator(target);
    });
  }

  function addItem() {
    mutateTypedBlock(tabId, block.id, "content-roi-tracker", (entry) => {
      entry.items.unshift(
        createWorkspaceContentRoiItem({
          title: "",
        }),
      );
    });
  }

  function removeItem(itemId: string) {
    mutateTypedBlock(tabId, block.id, "content-roi-tracker", (entry) => {
      entry.items = entry.items.filter((item) => item.id !== itemId);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Top platform{" "}
          {summary.topPlatform ? workspaceContentPlatformLabels[summary.topPlatform] : "none"} · Top
          campaign {summary.topCampaign || "no campaign"} · {summary.totalInfluencedLeads}{" "}
          influenced leads · {summary.averageScore} avg ROI ({summary.highReturnCount} high return)
        </p>
      </div>

      <div className="rounded-surface border border-muted bg-card p-surface">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Commercial impact tracker</p>
              <Badge variant="success" className="rounded-2xl px-3">
                {summary.highReturnCount} high return
              </Badge>
              <Badge variant="warning" className="rounded-2xl px-3">
                {promisingCount} promising
              </Badge>
              <Badge variant="destructive" className="rounded-2xl px-3">
                {underperformingCount} underperforming
              </Badge>
            </div>

            <p className="text-sm text-toned">
              Track which pieces actually create leads, influence conversions, and keep paying back
              through repurposing.
            </p>

            {topItem ? (
              <p className="text-xs text-toned">
                Best current performer:{" "}
                <span className="font-semibold text-foreground">
                  {topItem.title || "Untitled content"}
                </span>{" "}
                on {workspaceContentPlatformLabels[topItem.platform]}.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <BlockSelect
              value={block.sortBy}
              options={WORKSPACE_CONTENT_ROI_SORT_OPTIONS.map((sortBy) => ({
                label: workspaceContentRoiSortLabels[sortBy],
                value: sortBy,
              }))}
              className="w-36 rounded-xl"
              aria-label="Sort content ROI rows"
              onValueChange={(value) =>
                mutateTypedBlock(tabId, block.id, "content-roi-tracker", (entry) => {
                  entry.sortBy =
                    value === "reach" || value === "leads" || value === "roi" ? value : "roi";
                })
              }
            />

            <Button
              type="button"
              variant="secondary"
              className="rounded-full px-4"
              aria-label="Add content ROI row"
              onClick={addItem}
            >
              <Plus />
              Add
            </Button>
          </div>
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">No content ROI rows yet.</p>
          <p className="mt-2 text-sm text-toned">
            Add the first content piece to compare commercial performance across campaigns and
            platforms.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 rounded-full px-4"
            aria-label="Add first content ROI row"
            onClick={addItem}
          >
            <Plus />
            Add
          </Button>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          <div
            className="grid min-w-[1520px] gap-px overflow-hidden rounded-xl border border-muted bg-muted/20"
            style={rowGridStyle}
          >
            {tableHeaders.map((label) => (
              <div
                key={label}
                className="bg-muted px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
              >
                {label}
              </div>
            ))}

            {sortedItems.map((item) => {
              const score = getContentRoiScore(item);
              const status = getContentRoiStatus(score);

              return (
                <div key={item.id} className="contents">
                  <div className="flex items-center bg-background p-3">
                    <Input
                      value={item.title}
                      placeholder="Content piece"
                      className="border-0 bg-transparent px-0 text-sm font-bold shadow-none focus-visible:ring-0"
                      aria-label={`Content title for ${item.title || "new row"}`}
                      onChange={(event) =>
                        mutateItem(item.id, (entry) => {
                          entry.title = event.target.value.slice(0, 240);
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center bg-background p-3">
                    <BlockSelect
                      value={item.platform}
                      options={platformOptions}
                      className="rounded-2xl"
                      aria-label={`Platform for ${item.title || "content row"}`}
                      onValueChange={(value) =>
                        mutateItem(item.id, (entry) => {
                          entry.platform = toPlatform(value);
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center bg-background p-3">
                    <Input
                      value={item.campaign}
                      placeholder="Campaign"
                      className="w-full rounded-2xl"
                      aria-label={`Campaign for ${item.title || "content row"}`}
                      onChange={(event) =>
                        mutateItem(item.id, (entry) => {
                          entry.campaign = event.target.value.slice(0, 120);
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center bg-background p-3">
                    <Input
                      value={item.goal}
                      placeholder="Goal"
                      className="w-full rounded-2xl"
                      aria-label={`Goal for ${item.title || "content row"}`}
                      onChange={(event) =>
                        mutateItem(item.id, (entry) => {
                          entry.goal = event.target.value.slice(0, 160);
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center bg-background p-3">
                    <Input
                      type="number"
                      min={0}
                      value={String(item.reach)}
                      className="w-full rounded-2xl"
                      aria-label={`Reach for ${item.title || "content row"}`}
                      onChange={(event) =>
                        mutateItem(item.id, (entry) => {
                          entry.reach = clampInteger(event.target.value, 0, 10_000_000);
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center bg-background p-3">
                    <Input
                      type="number"
                      min={0}
                      value={String(item.leads)}
                      className="w-full rounded-2xl"
                      aria-label={`Leads for ${item.title || "content row"}`}
                      onChange={(event) =>
                        mutateItem(item.id, (entry) => {
                          entry.leads = clampInteger(event.target.value, 0, 100_000);
                        })
                      }
                    />
                  </div>

                  <div className="flex flex-col justify-center bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                        Score
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        {item.conversionInfluence}
                      </span>
                    </div>
                    <BlockSlider
                      min={1}
                      max={10}
                      value={item.conversionInfluence}
                      className="mt-2"
                      aria-label={`Conversion influence for ${item.title || "content row"}`}
                      onChange={(event) =>
                        mutateItem(item.id, (entry) => {
                          entry.conversionInfluence = clampInteger(event.target.value, 1, 10);
                        })
                      }
                    />
                  </div>

                  <div className="flex flex-col justify-center bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                        Score
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        {item.repurposeValue}
                      </span>
                    </div>
                    <BlockSlider
                      min={1}
                      max={10}
                      value={item.repurposeValue}
                      className="mt-2"
                      aria-label={`Repurpose value for ${item.title || "content row"}`}
                      onChange={(event) =>
                        mutateItem(item.id, (entry) => {
                          entry.repurposeValue = clampInteger(event.target.value, 1, 10);
                        })
                      }
                    />
                  </div>

                  <div className="bg-background p-3">
                    <div className={cn("min-w-0 rounded-xl border p-3", getStatusClasses(score))}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em]">
                        {workspaceContentRoiStatusLabels[status]}
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight">{score}</p>
                      <p className="mt-1 text-xs leading-relaxed opacity-70">
                        {getPerformanceSummary(score)}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed opacity-70">
                        {item.leads} leads, sorted by {workspaceContentRoiSortLabels[block.sortBy]}
                      </p>
                      <BlockProgressBar value={score} max={100} className="mt-3 h-1.5" />
                    </div>
                  </div>

                  <div className="flex items-center bg-background p-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${item.title || "content row"}`}
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
