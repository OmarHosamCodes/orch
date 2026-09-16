import {
  WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT,
  type WorkspaceNodeDashboardFeaturedBlock,
  type WorkspaceNodeDashboardSelectableBlock,
  type WorkspaceNodeTint,
  type WorkspaceNodeType,
} from "@orch/workspace";
import { Check, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AgencyIdentityField } from "@/features/shared/dialog-kit/agency-identity-field";
import { AgencyModeSegment } from "@/features/shared/dialog-kit/agency-mode-segment";
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
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { shellFocusRingClass, shellLabelClass } from "@/features/app-shell/app-shell-ui";
import { getWorkspaceBlockRegistryEntry } from "@/features/workspace/utils/workspace-block-registry";
import {
  getWorkspaceNodeTintOption,
  getWorkspaceNodeTintStyle,
  workspaceNodeTintOptions,
} from "@/features/workspace/utils/workspace-node-dashboard";
import { cn } from "@/lib/utils";

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

const nodeTypeOptions: Array<{ value: WorkspaceNodeType; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "orchestrator", label: "Orchestrator" },
];

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
  const nodeTypeDescription =
    nodeType === "orchestrator"
      ? "Coordinates linked nodes on the canvas."
      : "Standalone node for focused work.";
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
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create node" : "Edit node"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Name the node and set how it appears on the canvas."
              : "Update the node and choose what shows on its dashboard card."}
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            mode === "edit"
              ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
              : "space-y-6",
          )}
        >
          <div className="space-y-6">
            <section className="space-y-4">
              <div className="space-y-2">
                <AgencyIdentityField
                  id="node-title"
                  value={title}
                  autoFocus
                  placeholder="Strategy lane"
                  onChange={onTitleChange}
                  error={titleFieldError}
                  aria-label="Title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="node-content">Summary</Label>
                <Textarea
                  id="node-content"
                  value={content}
                  rows={3}
                  placeholder="Add a short summary for the canvas card."
                  onChange={(event) => onContentChange(event.target.value)}
                />
              </div>
            </section>
            <section className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-highlighted">Node type</p>
                <p className="mt-1 text-sm text-muted">
                  Standard for focused work, or orchestrator to coordinate linked nodes.
                </p>
              </div>
              <AgencyModeSegment
                aria-label="Node type"
                value={nodeType}
                options={nodeTypeOptions}
                onChange={onNodeTypeChange}
              />
              <p className="text-sm text-muted">{nodeTypeDescription}</p>
            </section>
            <section className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-highlighted">Tint</p>
                <p className="mt-1 text-sm text-muted">Color accent for this node on the canvas.</p>
              </div>
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
                      "node-tint-option relative flex size-11 items-center justify-center rounded-full border transition-colors",
                      shellFocusRingClass,
                      tint === option.value
                        ? "border-primary/50 bg-default ring-2 ring-primary/40"
                        : "border-muted/60 bg-elevated/40 hover:border-muted hover:bg-elevated/70",
                    )}
                    style={getWorkspaceNodeTintStyle(option.value)}
                    onClick={() => onTintChange(option.value)}
                  >
                    <span className="node-tint-swatch size-4 rounded-full border" />
                    {tint === option.value ? (
                      <Check className="absolute size-3.5 text-highlighted" />
                    ) : null}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted">
                {selectedTintMeta.label} — {selectedTintMeta.description}
              </p>
            </section>
          </div>
          {mode === "edit" ? (
            <div className="rounded-surface border border-muted/30 bg-card p-surface">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-highlighted">Dashboard card</p>
                    <p className="mt-1 text-sm text-muted">
                      Choose up to {WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT} block summaries to show
                      on this node&apos;s dashboard card.
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {selectionBadgeLabel}
                  </Badge>
                </div>
                {selectionLimitReached && groupedBlockOptions.length > 0 ? (
                  <p className="text-sm text-muted">
                    Limit reached. Deselect a block to choose another.
                  </p>
                ) : null}
              </div>
              <div className="mt-4">
                {groupedBlockOptions.length === 0 ? (
                  <p className="rounded-surface border border-dashed border-muted/40 bg-card px-surface py-surface text-sm text-muted">
                    Add blocks inside the node first, then return here to feature them on the card.
                  </p>
                ) : (
                  <div className="max-h-[24rem] space-y-4 overflow-y-auto overscroll-contain pr-1">
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
                                      : "border-muted/60 bg-background/80 hover:border-primary/30 hover:bg-default",
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
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!valid} onClick={handleSubmitClick}>
            {mode === "create" ? (
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
