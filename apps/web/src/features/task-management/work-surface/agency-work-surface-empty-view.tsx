import { FolderKanban } from "lucide-react";

import { AgencyFirstRunEmptyView } from "@/features/shared/views/agency-first-run-empty-view";
import { agencyWorkSurfaceStateClass } from "@/features/shared/agency-ui";

type AgencyWorkSurfaceEmptyViewProps = {
  canEditRecords: boolean;
  onNewProject: () => void;
  onAddClient: () => void;
  isEnsuringClient: boolean;
};

export function AgencyWorkSurfaceEmptyView({
  canEditRecords,
  onNewProject,
  onAddClient,
  isEnsuringClient,
}: AgencyWorkSurfaceEmptyViewProps) {
  if (!canEditRecords) {
    return (
      <AgencyFirstRunEmptyView
        className={agencyWorkSurfaceStateClass}
        icon={FolderKanban}
        title="Nothing here yet"
        body="This agency has no projects yet."
      />
    );
  }

  return (
    <AgencyFirstRunEmptyView
      className={agencyWorkSurfaceStateClass}
      icon={FolderKanban}
      title="Create a project to start tracking"
      body="Client is optional; we'll use Internal if you skip it."
      primaryLabel="New project"
      onPrimary={onNewProject}
      primaryPending={isEnsuringClient}
      secondaryLabel="Add client"
      onSecondary={onAddClient}
    />
  );
}
