import type { WorkspaceSwotBlock } from "@orch/workspace";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Textarea } from "@/ui/textarea";

const quadrants = [
  { key: "strengths" as const, label: "Strengths" },
  { key: "weaknesses" as const, label: "Weaknesses" },
  { key: "opportunities" as const, label: "Opportunities" },
  { key: "threats" as const, label: "Threats" },
];

export function WorkspaceSwotBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceSwotBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {quadrants.map((quadrant) => {
        const value = block.cells[quadrant.key] || "";
        const fieldId = `${block.id}-${quadrant.key}`;

        return (
          <article
            key={quadrant.key}
            className="space-y-2 rounded-surface border border-muted p-surface"
          >
            <label htmlFor={fieldId} className="block text-sm font-semibold">
              {quadrant.label}
            </label>
            <Textarea
              id={fieldId}
              value={value}
              rows={5}
              placeholder={`Capture ${quadrant.label.toLowerCase()} here...`}
              className="min-h-[120px] resize-y rounded-xl text-sm leading-relaxed"
              aria-label={quadrant.label}
              onChange={(event) =>
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== "swot") {
                    return;
                  }
                  entry.cells[quadrant.key] = event.target.value.slice(0, 4000);
                })
              }
            />
          </article>
        );
      })}
    </div>
  );
}
