import { AgencyProjectCreateDialog } from "@/features/projects/agency-project-create-dialog";
import type { AgencyListFiltersApplied } from "@/features/shared/use-agency-list-filters";

import { AgencyClientsTableView } from "../agency-clients-table-view";
import { useAgencyClientsTable } from "../hooks/use-agency-clients-table";

type AgencyClientsTableContainerProps = {
  teamId: string;
  filters: AgencyListFiltersApplied;
  onSelect: (clientId: string) => void;
};

export function AgencyClientsTableContainer({
  teamId,
  filters,
  onSelect,
}: AgencyClientsTableContainerProps) {
  const viewModel = useAgencyClientsTable({ teamId, filters });
  return (
    <>
      <AgencyClientsTableView
        viewModel={viewModel}
        searchQuery={filters.filterTerm}
        onSelect={onSelect}
      />
      <AgencyProjectCreateDialog
        open={Boolean(viewModel.createProjectClientId)}
        onOpenChange={(open) => {
          if (!open) viewModel.setCreateProjectClientId("");
        }}
        teamId={teamId}
        clients={viewModel.createProjectClients}
        lockClientId={viewModel.createProjectClientId || undefined}
      />
    </>
  );
}
