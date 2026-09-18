import {
  createWorkspaceStrategicAssumption,
  getAssumptionTrackerSummary,
  resolveStrategicAssumptionLinkLabel,
  workspaceBusinessModelCanvasCellLabels,
  workspaceStrategicAssumptionStatusLabels,
  type WorkspaceAssumptionTrackerBlock,
  type WorkspaceBusinessModelCanvasCellKey,
  type WorkspaceStrategicAssumption,
  type WorkspaceStrategicAssumptionFilter,
  type WorkspaceStrategicAssumptionLinkType,
  type WorkspaceStrategicAssumptionStatus,
} from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { AgencyDateField } from "@/features/shared/date/agency-date-field";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { BlockSlider } from "@/features/workspace/node/blocks/shared/block-slider";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";

const filterOptions: Array<{
  label: string;
  value: WorkspaceStrategicAssumptionFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Validating", value: "validating" },
  { label: "Confirmed", value: "confirmed" },
  { label: "At Risk", value: "at-risk" },
  { label: "False", value: "false" },
];

const statusOptions: WorkspaceStrategicAssumptionStatus[] = [
  "validating",
  "confirmed",
  "at-risk",
  "false",
];

function clampConfidence(value: string) {
  const numeric = Number(value || 3);
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

function getAssumptionLinkValue(assumption: WorkspaceStrategicAssumption) {
  if (assumption.linkType === "none" || !assumption.linkId) {
    return "none";
  }

  return `${assumption.linkType}:${assumption.linkId}`;
}

function parseLinkValue(value: string): {
  linkType: WorkspaceStrategicAssumptionLinkType;
  linkId: string | null;
} {
  if (!value || value === "none") {
    return {
      linkType: "none",
      linkId: null,
    };
  }

  const [rawLinkType, rawLinkId] = value.split(":");

  if ((rawLinkType === "okr" || rawLinkType === "decision" || rawLinkType === "bmc") && rawLinkId) {
    return {
      linkType: rawLinkType,
      linkId: rawLinkId,
    };
  }

  return {
    linkType: "none",
    linkId: null,
  };
}

export function WorkspaceAssumptionTrackerBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceAssumptionTrackerBlock>) {
  const { currentNode, mutateBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getAssumptionTrackerSummary(block), [block]);

  const baseLinkOptions = useMemo(() => {
    const options: Array<{ label: string; value: string }> = [{ label: "Unlinked", value: "none" }];

    if (!currentNode) {
      return options;
    }

    for (const tab of currentNode.tabs) {
      for (const tabBlock of tab.blocks) {
        if (tabBlock.type === "okr-tracker") {
          for (const objective of tabBlock.objectives) {
            options.push({
              label: `OKR: ${objective.title.trim() || "Untitled objective"}`,
              value: `okr:${objective.id}`,
            });
          }
        }

        if (tabBlock.type === "decision-matrix") {
          options.push({
            label: `Decision: ${tabBlock.question.trim() || tabBlock.title.trim() || "Untitled decision"}`,
            value: `decision:${tabBlock.id}`,
          });
        }
      }
    }

    for (const key of Object.keys(
      workspaceBusinessModelCanvasCellLabels,
    ) as WorkspaceBusinessModelCanvasCellKey[]) {
      options.push({
        label: `BMC: ${workspaceBusinessModelCanvasCellLabels[key]}`,
        value: `bmc:${key}`,
      });
    }

    return options;
  }, [currentNode]);

  const visibleAssumptions = useMemo(() => {
    if (block.filter === "all") {
      return block.assumptions;
    }

    return block.assumptions.filter((assumption) => assumption.status === block.filter);
  }, [block.assumptions, block.filter]);

  function getFilterCount(filter: WorkspaceStrategicAssumptionFilter) {
    if (filter === "all") {
      return block.assumptions.length;
    }

    return block.assumptions.filter((assumption) => assumption.status === filter).length;
  }

  function getLinkOptions(assumption: WorkspaceStrategicAssumption) {
    const currentValue = getAssumptionLinkValue(assumption);

    if (baseLinkOptions.some((option) => option.value === currentValue)) {
      return baseLinkOptions;
    }

    return [
      {
        label: currentValue === "none" ? "Unlinked" : "Missing link",
        value: currentValue,
      },
      ...baseLinkOptions,
    ];
  }

  function addAssumption() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "assumption-tracker") {
        return;
      }

      entry.assumptions.unshift(createWorkspaceStrategicAssumption());
    });
  }

  function removeAssumption(assumptionId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "assumption-tracker") {
        return;
      }

      entry.assumptions = entry.assumptions.filter((assumption) => assumption.id !== assumptionId);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Strategic Assumptions
          </h2>
          <p className="text-xs text-toned">Track bets behind the strategy and surface risks.</p>
          <p className="mt-1 text-xs text-toned">
            {summary.total} tracked · {summary.atRiskCount} at risk · avg confidence{" "}
            {summary.averageConfidence}/5
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={addAssumption}
        >
          <Plus />
          New Assumption
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            variant={block.filter === filter.value ? "secondary" : "ghost"}
            size="sm"
            className="rounded-full px-3"
            onClick={() =>
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== "assumption-tracker") {
                  return;
                }
                entry.filter = filter.value;
              })
            }
          >
            {filter.label} · {getFilterCount(filter.value)}
          </Button>
        ))}
      </div>

      {block.assumptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-10 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            Add an assumption to track a strategic bet.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4 rounded-full"
            onClick={addAssumption}
          >
            <Plus />
            Add
          </Button>
        </div>
      ) : visibleAssumptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-10 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            No assumptions match this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAssumptions.map((assumption) => (
            <article
              key={assumption.id}
              className="rounded-surface border border-muted bg-background p-surface"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Input
                    value={assumption.statement}
                    placeholder="Assumption statement"
                    className="w-full border-0 bg-transparent px-0 text-base font-semibold text-foreground shadow-none placeholder:text-muted focus-visible:ring-0"
                    onChange={(event) =>
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== "assumption-tracker") {
                          return;
                        }
                        const target = entry.assumptions.find(
                          (candidate) => candidate.id === assumption.id,
                        );
                        if (!target) {
                          return;
                        }
                        target.statement = event.target.value.slice(0, 240);
                      })
                    }
                  />

                  <p className="mt-1.5 text-xs text-toned">
                    {currentNode
                      ? resolveStrategicAssumptionLinkLabel(currentNode, assumption) ||
                        "No linked strategic area."
                      : "No linked strategic area."}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="rounded-lg px-3">
                    {workspaceStrategicAssumptionStatusLabels[assumption.status]}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove assumption"
                    onClick={() => removeAssumption(assumption.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <Label
                    htmlFor={`link-${assumption.id}`}
                    className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
                  >
                    Link
                  </Label>
                  <BlockSelect
                    id={`link-${assumption.id}`}
                    value={getAssumptionLinkValue(assumption)}
                    options={getLinkOptions(assumption)}
                    className="rounded-xl text-sm"
                    aria-label={`Link for assumption ${assumption.statement || assumption.id}`}
                    onValueChange={(value) =>
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== "assumption-tracker") {
                          return;
                        }
                        const target = entry.assumptions.find(
                          (candidate) => candidate.id === assumption.id,
                        );
                        if (!target) {
                          return;
                        }
                        const nextLink = parseLinkValue(value);
                        target.linkType = nextLink.linkType;
                        target.linkId = nextLink.linkId;
                      })
                    }
                  />
                </div>

                <div>
                  <Label
                    htmlFor={`owner-${assumption.id}`}
                    className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
                  >
                    Owner
                  </Label>
                  <Input
                    id={`owner-${assumption.id}`}
                    value={assumption.owner}
                    placeholder="Owner"
                    className="rounded-xl"
                    onChange={(event) =>
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== "assumption-tracker") {
                          return;
                        }
                        const target = entry.assumptions.find(
                          (candidate) => candidate.id === assumption.id,
                        );
                        if (!target) {
                          return;
                        }
                        target.owner = event.target.value.slice(0, 120);
                      })
                    }
                  />
                </div>

                <div>
                  <Label
                    htmlFor={`review-${assumption.id}`}
                    className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
                  >
                    Review Date
                  </Label>
                  <AgencyDateField
                    id={`review-${assumption.id}`}
                    value={assumption.reviewDate ?? ""}
                    displayStyle="short"
                    className="h-8 rounded-xl"
                    aria-label="Review date"
                    onChange={(next) =>
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== "assumption-tracker") {
                          return;
                        }
                        const target = entry.assumptions.find(
                          (candidate) => candidate.id === assumption.id,
                        );
                        if (!target) {
                          return;
                        }
                        target.reviewDate = next || null;
                      })
                    }
                    onClear={() =>
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== "assumption-tracker") {
                          return;
                        }
                        const target = entry.assumptions.find(
                          (candidate) => candidate.id === assumption.id,
                        );
                        if (!target) {
                          return;
                        }
                        target.reviewDate = null;
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
                <div className="space-y-3 rounded-xl border border-muted bg-background p-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                      <Label htmlFor={`confidence-${assumption.id}`}>Confidence</Label>
                      <span>{assumption.confidence}/5</span>
                    </div>
                    <BlockSlider
                      id={`confidence-${assumption.id}`}
                      value={assumption.confidence}
                      min={1}
                      max={5}
                      onChange={(event) =>
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== "assumption-tracker") {
                            return;
                          }
                          const target = entry.assumptions.find(
                            (candidate) => candidate.id === assumption.id,
                          );
                          if (!target) {
                            return;
                          }
                          target.confidence = clampConfidence(event.target.value);
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                      Status
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {statusOptions.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant={assumption.status === status ? "secondary" : "ghost"}
                          className="rounded-full px-3 text-xs"
                          onClick={() =>
                            mutateBlock(tabId, block.id, (entry) => {
                              if (entry.type !== "assumption-tracker") {
                                return;
                              }
                              const target = entry.assumptions.find(
                                (candidate) => candidate.id === assumption.id,
                              );
                              if (!target) {
                                return;
                              }
                              target.status = status;
                            })
                          }
                        >
                          {workspaceStrategicAssumptionStatusLabels[status]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor={`evidence-${assumption.id}`}
                    className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
                  >
                    Evidence Notes
                  </Label>
                  <Textarea
                    id={`evidence-${assumption.id}`}
                    value={assumption.evidenceNotes}
                    rows={3}
                    placeholder="What customer input, market signal, or operational evidence supports this?"
                    className="rounded-xl bg-background"
                    onChange={(event) =>
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== "assumption-tracker") {
                          return;
                        }
                        const target = entry.assumptions.find(
                          (candidate) => candidate.id === assumption.id,
                        );
                        if (!target) {
                          return;
                        }
                        target.evidenceNotes = event.target.value.slice(0, 4000);
                      })
                    }
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
