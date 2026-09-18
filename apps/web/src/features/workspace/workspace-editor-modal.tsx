import {
  WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT,
  type WorkspaceNodeDashboardFeaturedBlock,
  type WorkspaceNodeDashboardSelectableBlock,
  type WorkspaceNodeTint,
  type WorkspaceNodeType,
} from "@orch/workspace";
import { Check, GitBranch, Layers, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { shellFocusRingClass, shellLabelClass } from "@/features/app-shell/app-shell-ui";
import { AgencyIdentityField } from "@/features/shared/dialog-kit/agency-identity-field";
import {
  AgencySettingsField,
  AgencySettingsPaneSection,
} from "@/features/shared/views/agency-settings-pane-section";
import { getWorkspaceBlockRegistryEntry } from "@/features/workspace/utils/workspace-block-registry";
import {
  getWorkspaceNodeTintOption,
  getWorkspaceNodeTintStyle,
  workspaceNodeTintOptions,
} from "@/features/workspace/utils/workspace-node-dashboard";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Textarea } from "@/ui/textarea";

type WorkspaceEditorModalProps = {
  availableBlocks: WorkspaceNodeDashboardSelectableBlock[];
  content: string;
  featuredBlocks: WorkspaceNodeDashboardFeaturedBlock[];
  mode: "create" | "edit";
  nodeType: WorkspaceNodeType;
  open: boolean;
  tint: WorkspaceNodeTint;
  title: string;
  valid: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFeaturedBlocksChange: (value: WorkspaceNodeDashboardFeaturedBlock[]) => void;
  onContentChange: (value: string) => void;
  onNodeTypeChange: (value: WorkspaceNodeType) => void;
  onTintChange: (value: WorkspaceNodeTint) => void;
  onTitleChange: (value: string) => void;
};

const nodeTypeChoices: Array<{
  value: WorkspaceNodeType;
  label: string;
  description: string;
  icon: typeof Layers;
}> = [
  {
    value: "standard",
    label: "Standard",
    description: "Standalone node for focused work, notes, and blocks.",
    icon: Layers,
  },
  {
    value: "orchestrator",
    label: "Orchestrator",
    description: "Coordinates linked nodes and shared context on the canvas.",
    icon: GitBranch,
  },
];

function NodeCanvasPreview({
  title,
  content,
  tint,
  nodeType,
}: {
  title: string;
  content: string;
  tint: WorkspaceNodeTint;
  nodeType: WorkspaceNodeType;
}) {
  const tintMeta = getWorkspaceNodeTintOption(tint);
  const displayTitle = title.trim() || "Untitled node";
  const displaySummary = content.trim() || "Summary appears on the board card.";

  return (
    <div
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
      style={getWorkspaceNodeTintStyle(tint)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="size-2.5 rounded-full border border-[rgb(var(--workspace-node-rgb)/0.35)] bg-[rgb(var(--workspace-node-rgb)/0.85)]"
        />
        <Badge variant="secondary" className="text-[10px]">
          {nodeType === "orchestrator" ? "Orchestrator" : "Standard"}
        </Badge>
        <span className="text-[10px] text-muted-foreground">{tintMeta.label}</span>
      </div>
      <p className="mt-3 truncate text-sm font-semibold text-highlighted">{displayTitle}</p>
      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted">{displaySummary}</p>
    </div>
  );
}

function NodeTypeChoiceCard({
  choice,
  selected,
  onSelect,
}: {
  choice: (typeof nodeTypeChoices)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = choice.icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2 rounded-xl border p-3.5 text-left transition-colors",
        shellFocusRingClass,
        selected
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/25"
          : "border-border bg-background hover:bg-muted/30",
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4 shrink-0", selected ? "text-primary" : "text-muted")} />
        <span className="text-sm font-semibold text-foreground">{choice.label}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{choice.description}</p>
    </button>
  );
}

export function WorkspaceEditorModal({
  availableBlocks,
  content,
  featuredBlocks,
  mode,
  nodeType,
  open,
  tint,
  title,
  valid,
  onClose,
  onSubmit,
  onFeaturedBlocksChange,
  onContentChange,
  onNodeTypeChange,
  onTintChange,
  onTitleChange,
}: WorkspaceEditorModalProps) {
  const [submitAttempted, setSubmitAttempted] = useState(false);
  useEffect(() => {
    if (open) setSubmitAttempted(false);
  }, [open]);

  const selectedBlockKeys = useMemo(
    () => new Set(featuredBlocks.map((entry) => `${entry.tabId}:${entry.blockId}`)),
    [featuredBlocks],
  );
  const selectedCount = featuredBlocks.length;
  const selectionLimitReached = selectedCount >= WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT;
  const selectionBadgeLabel =
    availableBlocks.length === 0
      ? "No blocks"
      : `${selectedCount}/${WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT}`;

  const groupedBlockOptions = useMemo(() => {
    const groups: Array<{
      tabId: string;
      tabTitle: string;
      options: WorkspaceNodeDashboardSelectableBlock[];
    }> = [];
    for (const option of availableBlocks) {
      const existingGroup = groups.find((entry) => entry.tabId === option.tabId);
      if (existingGroup) {
        existingGroup.options.push(option);
        continue;
      }
      groups.push({ tabId: option.tabId, tabTitle: option.tabTitle, options: [option] });
    }
    return groups;
  }, [availableBlocks]);

  const titleFieldError =
    submitAttempted && !valid && !title.trim() ? "Title is required" : undefined;
  const selectedTintMeta = getWorkspaceNodeTintOption(tint);

  function toggleFeaturedBlock(option: WorkspaceNodeDashboardSelectableBlock) {
    const key = `${option.tabId}:${option.blockId}`;
    const isSelected = selectedBlockKeys.has(key);
    if (isSelected) {
      onFeaturedBlocksChange(
        featuredBlocks.filter(
          (entry) => !(entry.tabId === option.tabId && entry.blockId === option.blockId),
        ),
      );
      return;
    }
    if (selectionLimitReached) return;
    onFeaturedBlocksChange([...featuredBlocks, { tabId: option.tabId, blockId: option.blockId }]);
  }

  function handleSubmitClick() {
    setSubmitAttempted(true);
    if (valid) onSubmit();
  }

  const isCreate = mode === "create";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={cn(
          "flex max-h-[min(36rem,90vh)] flex-col gap-0 overflow-hidden p-0",
          isCreate ? "sm:max-w-2xl" : "sm:max-w-3xl",
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 text-left">
          <DialogTitle>{isCreate ? "Create node" : "Edit node"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Name the node, pick a type, and preview how it will read on the canvas."
              : "Update the node and choose what shows on its board card."}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain",
            isCreate
              ? "lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:overflow-hidden"
              : "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:overflow-hidden",
          )}
        >
          <div className="space-y-8 p-6">
            <AgencySettingsPaneSection title="Basics" className="border-t-0 pt-0">
              <div className="space-y-4">
                <AgencySettingsField label="Title" htmlFor="node-title">
                  <AgencyIdentityField
                    id="node-title"
                    value={title}
                    autoFocus
                    placeholder="Strategy lane"
                    onChange={onTitleChange}
                    error={titleFieldError}
                    aria-label="Title"
                  />
                </AgencySettingsField>
                <AgencySettingsField label="Summary" htmlFor="node-content">
                  <Textarea
                    id="node-content"
                    value={content}
                    rows={3}
                    placeholder="Short line for the board card."
                    className="min-h-[4.5rem] resize-none"
                    onChange={(event) => onContentChange(event.target.value)}
                  />
                </AgencySettingsField>
              </div>
            </AgencySettingsPaneSection>

            <AgencySettingsPaneSection
              title="Node type"
              description="Choose how this node behaves on the canvas."
            >
              <div
                className="flex flex-col gap-2 sm:flex-row"
                role="radiogroup"
                aria-label="Node type"
              >
                {nodeTypeChoices.map((choice) => (
                  <NodeTypeChoiceCard
                    key={choice.value}
                    choice={choice}
                    selected={nodeType === choice.value}
                    onSelect={() => onNodeTypeChange(choice.value)}
                  />
                ))}
              </div>
            </AgencySettingsPaneSection>

            <AgencySettingsPaneSection
              title="Tint"
              description={`${selectedTintMeta.label} — ${selectedTintMeta.description}`}
            >
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Node tint">
                {workspaceNodeTintOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={tint === option.value}
                    aria-label={option.label}
                    title={option.label}
                    className={cn(
                      "node-tint-option relative flex size-10 items-center justify-center rounded-full border transition-colors",
                      shellFocusRingClass,
                      tint === option.value
                        ? "border-primary/50 bg-default ring-2 ring-primary/40"
                        : "border-muted/60 bg-elevated/40 hover:border-muted hover:bg-elevated/70",
                    )}
                    style={getWorkspaceNodeTintStyle(option.value)}
                    onClick={() => onTintChange(option.value)}
                  >
                    <span
                      className="size-3.5 rounded-full border border-[rgb(var(--workspace-node-rgb)/0.35)] bg-[rgb(var(--workspace-node-rgb)/0.85)]"
                    />
                    {tint === option.value ? (
                      <Check className="absolute size-3 text-highlighted" />
                    ) : null}
                  </button>
                ))}
              </div>
            </AgencySettingsPaneSection>
          </div>

          {isCreate ? (
            <aside className="border-t border-border bg-muted/20 p-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">
              <p className="text-xs font-medium text-muted-foreground">Board preview</p>
              <div className="mt-3">
                <NodeCanvasPreview
                  title={title}
                  content={content}
                  tint={tint}
                  nodeType={nodeType}
                />
              </div>
            </aside>
          ) : (
            <div className="border-t border-border bg-muted/15 p-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">
              <AgencySettingsPaneSection
                title="Dashboard card"
                description={`Choose up to ${WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT} block summaries for this node's board card.`}
                className="border-t-0 pt-0"
              >
                <div className="mb-3 flex justify-end">
                  <Badge variant="secondary">{selectionBadgeLabel}</Badge>
                </div>
                {selectionLimitReached && groupedBlockOptions.length > 0 ? (
                  <p className="mb-3 text-xs text-muted-foreground">
                    Limit reached. Deselect a block to choose another.
                  </p>
                ) : null}
                {groupedBlockOptions.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    Add blocks inside the node first, then return here to feature them on the card.
                  </p>
                ) : (
                  <div className="max-h-[min(20rem,40vh)] space-y-4 overflow-y-auto overscroll-contain pr-1">
                    {groupedBlockOptions.map((group) => (
                      <section key={group.tabId}>
                        <p className={cn("mb-2", shellLabelClass)}>{group.tabTitle}</p>
                        <div className="grid gap-1.5">
                          {group.options.map((option) => {
                            const isSelected = selectedBlockKeys.has(
                              `${option.tabId}:${option.blockId}`,
                            );
                            const isDisabled = selectionLimitReached && !isSelected;
                            const entry = getWorkspaceBlockRegistryEntry(option.blockType);
                            const OptionIcon = entry.icon;
                            return (
                              <button
                                key={option.blockId}
                                type="button"
                                className={cn(
                                  "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors",
                                  shellFocusRingClass,
                                  isSelected
                                    ? "border-primary/40 bg-primary/10"
                                    : isDisabled
                                      ? "cursor-not-allowed border-muted/40 bg-elevated/20 opacity-60"
                                      : "border-border bg-background hover:border-primary/30 hover:bg-muted/30",
                                )}
                                aria-pressed={isSelected}
                                disabled={isDisabled}
                                onClick={() => toggleFeaturedBlock(option)}
                              >
                                <OptionIcon
                                  className={cn(
                                    "size-4 shrink-0",
                                    isSelected ? "text-primary" : "text-muted",
                                  )}
                                />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
                                  {option.blockTitle}
                                </span>
                                {isSelected ? (
                                  <Check className="size-4 shrink-0 text-primary" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </AgencySettingsPaneSection>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!valid && submitAttempted} onClick={handleSubmitClick}>
            {isCreate ? (
              <>
                <Plus className="size-4" />
                Create node
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
