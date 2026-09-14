import { createWorkspace2x2MatrixItem, type Workspace2x2MatrixBlock } from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

const quadrants = ["topLeft", "topRight", "bottomLeft", "bottomRight"] as const;

type MatrixField =
  | "xAxisLabel"
  | "yAxisLabel"
  | "xStartLabel"
  | "xEndLabel"
  | "yStartLabel"
  | "yEndLabel";

export function Workspace2x2MatrixBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<Workspace2x2MatrixBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  function updateMatrixField(field: MatrixField, value: string, limit: number) {
    mutateTypedBlock(tabId, block.id, "2x2-matrix", (entry) => {
      entry[field] = value.slice(0, limit);
    });
  }

  function updateQuadrantName(quadrantKey: (typeof quadrants)[number], value: string) {
    mutateTypedBlock(tabId, block.id, "2x2-matrix", (entry) => {
      entry.quadrants[quadrantKey].name = value.slice(0, 80);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-muted p-4">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={block.yEndLabel}
          placeholder="Y high"
          className="max-w-40 rounded-xl"
          aria-label="Vertical axis high label"
          onChange={(event) => updateMatrixField("yEndLabel", event.target.value, 60)}
        />
        <Input
          value={block.yAxisLabel}
          placeholder="Vertical axis"
          className="max-w-48 rounded-xl"
          aria-label="Vertical axis"
          onChange={(event) => updateMatrixField("yAxisLabel", event.target.value, 80)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {quadrants.map((quadrantKey) => (
          <article key={quadrantKey} className="rounded-surface border border-muted p-surface">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs text-muted-foreground">
                  {block.quadrants[quadrantKey].items.length} items
                </p>
                <Input
                  value={block.quadrants[quadrantKey].name}
                  className="rounded-xl"
                  aria-label={`Quadrant name for ${quadrantKey}`}
                  onChange={(event) => updateQuadrantName(quadrantKey, event.target.value)}
                />
              </div>
              {block.quadrants[quadrantKey].items.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  aria-label={`Add item to ${block.quadrants[quadrantKey].name || "quadrant"}`}
                  onClick={() =>
                    mutateTypedBlock(tabId, block.id, "2x2-matrix", (entry) => {
                      entry.quadrants[quadrantKey].items.push(
                        createWorkspace2x2MatrixItem({ text: "" }),
                      );
                    })
                  }
                >
                  <Plus />
                  Add
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              {block.quadrants[quadrantKey].items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-xl border border-muted p-2"
                >
                  <Input
                    value={item.text}
                    placeholder="Matrix item"
                    className="flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                    onChange={(event) =>
                      mutateTypedBlock(tabId, block.id, "2x2-matrix", (entry) => {
                        const target = entry.quadrants[quadrantKey].items.find(
                          (candidate) => candidate.id === item.id,
                        );
                        if (target) {
                          target.text = event.target.value.slice(0, 200);
                        }
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg hover:text-destructive"
                    aria-label="Remove matrix item"
                    onClick={() =>
                      mutateTypedBlock(tabId, block.id, "2x2-matrix", (entry) => {
                        entry.quadrants[quadrantKey].items = entry.quadrants[
                          quadrantKey
                        ].items.filter((candidate) => candidate.id !== item.id);
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}

              {block.quadrants[quadrantKey].items.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No items in this quadrant.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3 rounded-full"
                    aria-label={`Add item to ${block.quadrants[quadrantKey].name || "quadrant"}`}
                    onClick={() =>
                      mutateTypedBlock(tabId, block.id, "2x2-matrix", (entry) => {
                        entry.quadrants[quadrantKey].items.push(
                          createWorkspace2x2MatrixItem({ text: "" }),
                        );
                      })
                    }
                  >
                    <Plus />
                    Add
                  </Button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Input
          value={block.xStartLabel}
          placeholder="X low"
          className="max-w-32 rounded-xl"
          aria-label="Horizontal axis low label"
          onChange={(event) => updateMatrixField("xStartLabel", event.target.value, 60)}
        />
        <Input
          value={block.xAxisLabel}
          placeholder="Horizontal axis"
          className="max-w-48 rounded-xl"
          aria-label="Horizontal axis"
          onChange={(event) => updateMatrixField("xAxisLabel", event.target.value, 80)}
        />
        <Input
          value={block.xEndLabel}
          placeholder="X high"
          className="max-w-32 rounded-xl"
          aria-label="Horizontal axis high label"
          onChange={(event) => updateMatrixField("xEndLabel", event.target.value, 60)}
        />
      </div>
      <Input
        value={block.yStartLabel}
        placeholder="Y low"
        className="max-w-40 rounded-xl"
        aria-label="Vertical axis low label"
        onChange={(event) => updateMatrixField("yStartLabel", event.target.value, 60)}
      />
    </div>
  );
}
