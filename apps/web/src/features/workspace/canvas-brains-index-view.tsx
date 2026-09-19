import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import { ChevronRight, Search } from "lucide-react";

import type { CanvasBrainCreateDialogViewProps } from "@/features/workspace/canvas-brain-create-dialog-view";
import { CanvasBrainCreateDialogView } from "@/features/workspace/canvas-brain-create-dialog-view";
import type { CanvasBrainListItem } from "@/features/workspace/hooks/use-canvas-brains";
import { canvasWorkspaceHref } from "@/features/workspace/canvas-workspace-path";
import { formatRelativeReportTime } from "@/features/reports/agency-report-naming";
import { AgencyEntityIconMarkPickerView } from "@/features/shared/agency-entity-icon-picker-view";
import { projectHueStyle } from "@/features/shared/project-palette";
import { Link } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { SurfaceShimmer } from "@/ui/skeleton";

export type CanvasBrainSort = "recent" | "alpha";

// This index lists brains. Existing spatial boards are the frozen Legacy Canvas.

export type CanvasBrainsIndexViewProps = {
  items: CanvasBrainListItem[];
  brainCount: number;
  isPending: boolean;
  errorMessage: string | null;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  sort: CanvasBrainSort;
  onSortChange: (value: CanvasBrainSort) => void;
  onBrainIconChange: (brainId: string, iconKey: AgencyEntityIconKey | null) => void;
  onBrainColorChange: (brainId: string, colorHueId: number) => void;
  appearancePending?: boolean;
  create: CanvasBrainCreateDialogViewProps & { openCreate: () => void };
};

function brainCountLabel(count: number) {
  return count === 1 ? "1 brain" : `${count} brains`;
}

function CanvasBrainRow({
  brain,
  showContinueHint,
  onIconChange,
  onColorChange,
  appearancePending,
}: {
  brain: CanvasBrainListItem;
  showContinueHint: boolean;
  onIconChange: (iconKey: AgencyEntityIconKey | null) => void;
  onColorChange: (colorHueId: number) => void;
  appearancePending: boolean;
}) {
  const secondary = brain.instructions.trim() || "Spatial board and knowledge";
  const editedLabel = formatRelativeReportTime(brain.updatedAt);
  const hueStyle = projectHueStyle(brain.id, brain.colorHueId);

  return (
    <div
      className={cn(
        "group flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5",
        "transition-colors hover:bg-muted/40",
      )}
      style={hueStyle}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--project-hue-soft)] dark:bg-[var(--project-hue-soft-dark)]">
        <AgencyEntityIconMarkPickerView
          name={brain.title}
          projectId={brain.id}
          iconKey={brain.iconKey}
          colorHueId={brain.colorHueId}
          size="header"
          disabled={appearancePending}
          ariaLabel={`Change icon for ${brain.title}`}
          onChange={onIconChange}
          onColorHueChange={onColorChange}
        />
      </span>
      <Link
        to={canvasWorkspaceHref(brain.id)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{brain.title}</span>
            {showContinueHint ? (
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium",
                  "bg-[var(--project-hue-soft)] text-[var(--project-hue)]",
                  "dark:bg-[var(--project-hue-soft-dark)] dark:text-[var(--project-hue-dark)]",
                )}
              >
                Continue
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{secondary}</span>
        </span>
        <span className="hidden shrink-0 font-mono text-xs tabular-nums text-muted-foreground sm:block">
          {editedLabel}
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      </Link>
    </div>
  );
}

export function CanvasBrainsIndexView({
  items,
  brainCount,
  isPending,
  errorMessage,
  searchTerm,
  onSearchTermChange,
  sort,
  onSortChange,
  onBrainIconChange,
  onBrainColorChange,
  appearancePending = false,
  create,
}: CanvasBrainsIndexViewProps) {
  const { openCreate, ...createDialog } = create;
  const showContinueHint = sort === "recent" && items.length > 0;
  const continueBrainId = showContinueHint ? items[0]?.id : null;

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Canvas</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Pick up where you left off. Orch can search every brain from here.
          </p>
          {!isPending && brainCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              Orch searches {brainCountLabel(brainCount)}.
            </p>
          ) : null}
        </div>
        <Button type="button" className="shrink-0 self-start" onClick={openCreate}>
          New brain
        </Button>
      </header>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {!isPending ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Search brains…"
              aria-label="Search brains"
              className="h-9 pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="text-xs text-muted-foreground">{brainCountLabel(brainCount)}</span>
            <Select value={sort} onValueChange={(value) => onSortChange(value as CanvasBrainSort)}>
              <SelectTrigger className="h-9 w-[9.5rem]" aria-label="Sort brains">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="alpha">A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {isPending ? (
        <SurfaceShimmer className="min-h-56 flex-1 rounded-lg" label="Loading brains" />
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center">
          {searchTerm.trim() ? (
            <>
              <p className="text-sm font-medium text-foreground">No brains match that search.</p>
              <Button type="button" variant="outline" onClick={() => onSearchTermChange("")}>
                Clear search
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">No brains yet.</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Create a brain to keep a separate board and knowledge space.
              </p>
              <Button type="button" onClick={openCreate}>
                New brain
              </Button>
            </>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((brain) => (
            <li key={brain.id}>
              <CanvasBrainRow
                brain={brain}
                showContinueHint={brain.id === continueBrainId && brainCount > 1}
                appearancePending={appearancePending}
                onIconChange={(iconKey) => onBrainIconChange(brain.id, iconKey)}
                onColorChange={(colorHueId) => onBrainColorChange(brain.id, colorHueId)}
              />
            </li>
          ))}
        </ul>
      )}

      <CanvasBrainCreateDialogView {...createDialog} />
    </div>
  );
}
