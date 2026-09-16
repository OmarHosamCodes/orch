import {
  AlertTriangle,
  ArchiveRestore,
  Building2,
  FolderKanban,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyLabelClass,
  agencyWorkMetricClass,
} from "@/features/shared/agency-ui";
import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format-duration";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { SurfaceShimmer } from "@/ui/skeleton";

import {
  projectBookCorridorAccentClass,
  projectBookNeedChipClass,
  projectBookNeedLabel,
  projectBookWeekHeatBarClass,
  projectHasBudget,
  type ProjectBookNeedId,
} from "./projects-book-corridors";
import type {
  AgencyProjectsBookRow,
  AgencyProjectsTableViewModel,
} from "./hooks/use-agency-projects-table";

type AgencyProjectsTableViewProps = {
  viewModel: AgencyProjectsTableViewModel;
  searchQuery: string;
  onSelect: (projectId: string) => void;
};

function NeedChip({ id }: { id: ProjectBookNeedId }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em]",
        projectBookNeedChipClass(id),
      )}
    >
      {projectBookNeedLabel(id)}
    </span>
  );
}

function WeekHeat({
  share,
  durationSeconds,
  hasAtRiskNeed,
}: {
  share: number;
  durationSeconds: number;
  hasAtRiskNeed: boolean;
}) {
  const width = `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%`;
  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <span
        className={cn(
          agencyWorkMetricClass,
          "text-right text-xs",
          durationSeconds > 0 ? "text-highlighted" : "text-dimmed",
        )}
      >
        {formatDuration(durationSeconds, "short")}
      </span>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={cn(
            "h-full rounded-full motion-reduce:transition-none",
            projectBookWeekHeatBarClass({ durationSeconds, hasAtRiskNeed }),
          )}
          style={{ width }}
        />
      </div>
      <span className="sr-only">
        {hasAtRiskNeed
          ? `This week ${formatDuration(durationSeconds, "short")}, budget at risk`
          : `This week ${formatDuration(durationSeconds, "short")}`}
      </span>
    </div>
  );
}

function ProjectBookRow({
  project,
  searchQuery,
  viewModel,
  onSelect,
}: {
  project: AgencyProjectsBookRow;
  searchQuery: string;
  viewModel: AgencyProjectsTableViewModel;
  onSelect: (projectId: string) => void;
}) {
  const { isOwner, isProjectMutationPending, requestDeleteProject, restoreProject } = viewModel;
  const isTrashed = Boolean(project.deletedAt);
  const hasBudget = projectHasBudget(viewModel.budgetsByProject.get(project.id) ?? null);

  return (
    <div
      data-project-id={project.id}
      className={cn(
        "group grid cursor-pointer grid-cols-1 items-center gap-3 border-b border-default px-4 py-3 last:border-b-0",
        "hover:bg-elevated/40 motion-reduce:transition-none md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_8.5rem_5.5rem_2.5rem]",
        agencyFocusRingClass,
        isTrashed && "opacity-90",
      )}
      onClick={() => onSelect(project.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(project.id);
        }
      }}
      tabIndex={0}
      aria-label={`Open ${project.name}`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <AgencyEntityMark
            name={project.name}
            projectId={project.id}
            iconKey={project.iconKey}
            colorHueId={project.colorHueId}
          />
          <span
            className={cn(
              "truncate text-sm font-bold",
              isTrashed ? "text-muted line-through" : "text-highlighted",
            )}
          >
            <AgencySearchHighlight text={project.name} query={searchQuery} />
          </span>
        </div>
        {project.needs.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {project.needs.map((need) => (
              <NeedChip key={need} id={need} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="truncate text-[11px] font-bold text-muted">
            <AgencySearchHighlight text={project.clientName} query={searchQuery} />
          </span>
          {project.clientArchivedAt ? (
            <span className="inline-flex shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              Archived
            </span>
          ) : null}
        </div>
      </div>

      <WeekHeat
        share={project.weekShare}
        durationSeconds={project.weekDurationSeconds}
        hasAtRiskNeed={project.needs.includes("at_risk")}
      />

      <span
        className={cn(
          "font-mono text-xs font-bold tabular-nums md:text-right",
          hasBudget ? "text-highlighted" : "text-dimmed",
        )}
      >
        {hasBudget ? `${project.budgetPct}%` : "None"}
      </span>

      <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
        {isOwner ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-80 group-hover:opacity-100 group-focus-within:opacity-100"
                aria-label={`Actions for ${project.name}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
              <DropdownMenuItem onSelect={() => onSelect(project.id)}>Open project</DropdownMenuItem>
              {isTrashed ? (
                <DropdownMenuItem
                  disabled={isProjectMutationPending}
                  onSelect={() => restoreProject(project)}
                >
                  <ArchiveRestore className="size-3.5" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={isProjectMutationPending}
                  onSelect={() => requestDeleteProject(project)}
                >
                  <Trash2 className="size-3.5" />
                  Move to trash
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}

export function AgencyProjectsTableView({
  viewModel,
  searchQuery,
  onSelect,
}: AgencyProjectsTableViewProps) {
  const {
    openNewProject,
    isOwner,
    corridors,
    clients,
    projects,
    isLoading,
    isError,
    errorMessage,
    refetchProjects,
    isProjectMutationPending,
    pendingDeleteProject,
    cancelDeleteProject,
    confirmDeleteProject,
  } = viewModel;

  if (isLoading) {
    return <SurfaceShimmer className="min-h-80" label="Loading projects" />;
  }

  if (isError) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-bold text-highlighted">Couldn&apos;t load projects.</p>
        <p className="mt-1 text-xs text-muted">{errorMessage}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={refetchProjects}>
          Retry
        </Button>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className={agencyEmptyPanelClass}>
        <Building2 className="mx-auto size-6 text-muted" />
        <p className="mt-3 text-sm font-bold text-highlighted">No clients yet.</p>
        <p className="mt-1 text-xs text-muted">
          Add a client first, then their projects show up here.
        </p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className={agencyEmptyPanelClass}>
        <FolderKanban className="mx-auto size-6 text-muted" />
        <p className="mt-3 text-sm font-bold text-highlighted">No projects yet.</p>
        <p className="mt-1 text-xs text-muted">
          Create your first project to start tracking time and budgets.
        </p>
        {isOwner ? (
          <Button variant="secondary" size="sm" className="mt-4" onClick={openNewProject}>
            <Plus />
            New project
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="agency-projects flex flex-col gap-6 pb-8">
        <div
          className={cn(
            "hidden px-4 py-2 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_8.5rem_5.5rem_2.5rem]",
            agencyLabelClass,
            "text-dimmed",
          )}
          aria-hidden
        >
          <span>Project</span>
          <span>Client</span>
          <span className="text-right">This week</span>
          <span className="text-right">Budget</span>
          <span className="text-right">Actions</span>
        </div>
        {corridors.length === 0 ? (
          <div className="rounded-surface border border-default bg-default p-surface text-center">
            <p className="text-sm font-bold text-highlighted">No projects match.</p>
            <p className="mt-1 text-xs text-muted">Try a different search or trash filter.</p>
          </div>
        ) : (
          corridors.map((corridor) => (
            <section key={corridor.id} aria-labelledby={`project-corridor-${corridor.id}`}>
              <header className="mb-2 flex items-baseline justify-between gap-3 px-1">
                <h2
                  id={`project-corridor-${corridor.id}`}
                  className={cn(agencyLabelClass, projectBookCorridorAccentClass(corridor.id))}
                >
                  {corridor.label}
                </h2>
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    projectBookCorridorAccentClass(corridor.id),
                    corridor.id === "trash" || corridor.id === "quiet" ? "opacity-70" : "opacity-90",
                  )}
                >
                  {corridor.items.length}
                </span>
              </header>
              <div className="overflow-hidden rounded-surface border border-default bg-default">
                {corridor.items.map((project) => (
                  <ProjectBookRow
                    key={project.id}
                    project={project}
                    searchQuery={searchQuery}
                    viewModel={viewModel}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <Dialog
        open={Boolean(pendingDeleteProject)}
        onOpenChange={(open) => {
          if (!open) cancelDeleteProject();
        }}
      >
        <DialogContent className="max-w-md" showCloseButton={!isProjectMutationPending}>
          <DialogHeader>
            <DialogTitle>Delete &quot;{pendingDeleteProject?.name ?? "this project"}&quot;?</DialogTitle>
            <DialogDescription>
              Moves the project to trash for 30 days. It disappears from Agency listings and
              choosers. Time entries stay; you can restore anytime until permanent delete.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={isProjectMutationPending}
              onClick={cancelDeleteProject}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isProjectMutationPending || !pendingDeleteProject}
              onClick={confirmDeleteProject}
            >
              {isProjectMutationPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                  Moving…
                </>
              ) : (
                "Move to trash"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
