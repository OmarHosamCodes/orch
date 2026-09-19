import { CanvasBrainCreateDialogView } from "@/features/workspace/canvas-brain-create-dialog-view";
import type { CanvasBrainCreateDialogViewProps } from "@/features/workspace/canvas-brain-create-dialog-view";
import type { CanvasBrainListItem } from "@/features/workspace/hooks/use-canvas-brains";
import { canvasWorkspaceHref } from "@/features/workspace/canvas-workspace-path";
import { ShellRailNavRow, ShellRailNestedGroup } from "@/features/app-shell/app-shell-rail-items";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { LucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";

export type CanvasBrainsRailViewProps = {
  items: CanvasBrainListItem[];
  activeWorkspaceId: string | null;
  onNavigate?: () => void;
  create: CanvasBrainCreateDialogViewProps & { openCreate: () => void };
};

export function CanvasBrainsRailView({
  items,
  activeWorkspaceId,
  onNavigate,
  create,
}: CanvasBrainsRailViewProps) {
  const { openCreate, ...createDialog } = create;

  return (
    <>
      <ShellRailNestedGroup aria-label="Canvas brains">
        {items.map((brain) => (
          <ShellRailNavRow
            key={brain.id}
            to={canvasWorkspaceHref(brain.id)}
            icon="i-lucide-brain"
            label={brain.title}
            selected={activeWorkspaceId === brain.id}
            navId={`canvas-brain-${brain.id}`}
            nested
            onNavigate={onNavigate}
          />
        ))}
        <button
          type="button"
          className={cn("app-shell__rail-row app-shell__rail-row--nested", shellFocusRingClass)}
          onClick={() => {
            openCreate();
          }}
        >
          <span className="app-shell__rail-icon-tile app-shell__rail-icon-tile--nested">
            <LucideIcon name="i-lucide-plus" className="app-shell__rail-icon-tile-glyph" />
          </span>
          <span className="app-shell__rail-row-label">New brain</span>
        </button>
      </ShellRailNestedGroup>
      <CanvasBrainCreateDialogView {...createDialog} />
    </>
  );
}
