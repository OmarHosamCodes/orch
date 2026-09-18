import type { WorkspaceBlock } from "@orch/workspace";
import { Blocks } from "lucide-react";

import { Button } from "@/ui/button";
import {
  getWorkspaceBlockRegistryEntry,
  workspacePrimaryBlockTypes,
} from "@/features/workspace/utils/workspace-block-registry";
import type { WorkspaceAddBlockCommandView } from "@/features/workspace/node/workspace-add-block-command";

type WorkspaceNodeEmptyStateProps = {
  canEdit: boolean;
  onAddBlock: (type: WorkspaceBlock["type"]) => string | null;
  onQuickAdd: (type: WorkspaceBlock["type"], blockId: string | null) => void;
  onBrowseAll: (view: WorkspaceAddBlockCommandView) => void;
};

export function WorkspaceNodeEmptyState({
  canEdit,
  onAddBlock,
  onQuickAdd,
  onBrowseAll,
}: WorkspaceNodeEmptyStateProps) {
  const defaultType = workspacePrimaryBlockTypes[0];
  const defaultEntry = defaultType ? getWorkspaceBlockRegistryEntry(defaultType) : null;
  const DefaultIcon = defaultEntry?.icon;

  if (!canEdit) {
    return (
      <div className="rounded-2xl border border-dashed border-muted/40 px-6 py-16 text-center text-sm text-muted-foreground">
        Nothing here yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-muted/40 px-6 py-12 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-muted bg-muted text-toned">
        <Blocks className="size-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-highlighted">Start this workspace</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Add a block to capture tasks, notes, or decisions.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {defaultType && defaultEntry && DefaultIcon ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const blockId = onAddBlock(defaultType);
              onQuickAdd(defaultType, blockId);
            }}
          >
            <DefaultIcon className="size-4" aria-hidden />
            Add {defaultEntry.label.toLowerCase()}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={() => onBrowseAll("browse")}>
          Browse all blocks
        </Button>
      </div>
    </div>
  );
}
