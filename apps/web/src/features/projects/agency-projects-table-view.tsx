import { AlertTriangle, Building2, FolderKanban, Loader2, Plus } from "lucide-react";

import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { SurfaceShimmer } from "@/ui/skeleton";
import { AgencyProjectsVirtualTable } from "@/features/projects/agency-projects-virtual-table";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";
import { type AgencyProjectsTableViewModel } from "./hooks/use-agency-projects-table";

type AgencyProjectsTableViewProps = {
  viewModel: AgencyProjectsTableViewModel;
  searchQuery: string;
  onSelect: (projectId: string) => void;
};

export function AgencyProjectsTableView({
  viewModel,
  searchQuery,
  onSelect,
}: AgencyProjectsTableViewProps) {
  const {
    openNewProject,
    isOwner,
    filteredProjects,
    hoursThisWeekByProject,
    budgetsByProject,
    budgetPctFor,
    budgetToneFor,
    isLoading,
    isError,
    errorMessage,
    clients,
    projects,
    refetchProjects,
    isProjectMutationPending,
    pendingDeleteProject,
    requestDeleteProject,
    cancelDeleteProject,
    confirmDeleteProject,
    restoreProject,
  } = viewModel;

  if (isLoading) {
    return <SurfaceShimmer className="min-h-80" label="Loading projects" />;
  }

  if (isError) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load projects.</p>
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
        <Button variant="secondary" size="sm" className="mt-4" onClick={openNewProject}>
          <Plus />
          New project
        </Button>
      </div>
    );
  }

  return (
    <>
      {filteredProjects.length === 0 ? (
        <div className="rounded-surface border border-default bg-default p-surface text-center">
          <p className="text-sm font-bold text-highlighted">No projects match.</p>
          <p className="mt-1 text-xs text-muted">Try a different search or trash filter.</p>
        </div>
      ) : (
        <div className="agency-projects">
          <AgencyProjectsVirtualTable
            projects={filteredProjects}
            hoursThisWeekByProject={hoursThisWeekByProject}
            budgetsByProject={budgetsByProject}
            budgetPctFor={budgetPctFor}
            budgetToneFor={budgetToneFor}
            searchQuery={searchQuery}
            onSelect={onSelect}
            isOwner={isOwner}
            isProjectMutationPending={isProjectMutationPending}
            onRequestDelete={requestDeleteProject}
            onRestore={restoreProject}
          />
        </div>
      )}

      <Dialog
        open={Boolean(pendingDeleteProject)}
        onOpenChange={(open) => {
          if (!open) cancelDeleteProject();
        }}
      >
        <DialogContent className="max-w-md" showCloseButton={!isProjectMutationPending}>
          <DialogHeader>
            <DialogTitle>Delete "{pendingDeleteProject?.name ?? "this project"}"?</DialogTitle>
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
