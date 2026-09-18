import {
  createWorkspaceChecklistItem,
  getChecklistProgress,
  type WorkspaceChecklistBlock,
} from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

export function WorkspaceChecklistBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceChecklistBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const progress = useMemo(() => getChecklistProgress(block), [block]);

  function mutateChecklistItem(
    itemId: string,
    mutator: (item: WorkspaceChecklistBlock["items"][number]) => void,
  ) {
    mutateTypedBlock(tabId, block.id, "checklist", (entry) => {
      const target = entry.items.find((candidate) => candidate.id === itemId);
      if (!target) {
        return;
      }
      mutator(target);
    });
  }

  function addItem() {
    mutateTypedBlock(tabId, block.id, "checklist", (entry) => {
      entry.items.push(createWorkspaceChecklistItem({ text: "" }));
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-toned">
          {progress.completed}/{progress.total} complete
        </p>
        <BlockProgressBar value={progress.completed} max={Math.max(progress.total, 1)} />
      </div>

      <div className="space-y-2">
        {block.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-muted p-3">
            <BlockCheckbox
              checked={item.completed}
              aria-label={
                item.completed ? "Mark checklist item as open" : "Mark checklist item as complete"
              }
              onCheckedChange={(checked) =>
                mutateChecklistItem(item.id, (entry) => {
                  entry.completed = checked;
                })
              }
            />

            <Input
              value={item.text}
              placeholder="Checklist item"
              className={cn(
                "flex-1 border-0 bg-transparent px-0 font-medium shadow-none focus-visible:ring-0",
                item.completed ? "text-toned line-through" : "text-foreground",
              )}
              onChange={(event) =>
                mutateChecklistItem(item.id, (entry) => {
                  entry.text = event.target.value.slice(0, 240);
                })
              }
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg text-toned hover:text-destructive"
              aria-label="Delete checklist item"
              onClick={() =>
                mutateTypedBlock(tabId, block.id, "checklist", (entry) => {
                  entry.items = entry.items.filter((candidate) => candidate.id !== item.id);
                })
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}

        {block.items.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No checklist items yet.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 rounded-full"
              aria-label="Add checklist item"
              onClick={addItem}
            >
              <Plus />
              Add item
            </Button>
          </div>
        ) : null}

        {block.items.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            aria-label="Add checklist item"
            onClick={addItem}
          >
            <Plus />
            Add item
          </Button>
        ) : null}
      </div>
    </div>
  );
}
