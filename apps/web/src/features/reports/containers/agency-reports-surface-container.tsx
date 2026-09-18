import { AgencyReportActivityMenu } from "@/features/reports/creator/agency-report-activity-menu";
import { AgencyReportEntryDetailsDialog } from "@/features/reports/agency-report-entry-details-dialog";
import { AgencyReportsStudioView } from "@/features/reports/agency-reports-studio-view";
import { useAgencyReportsSurface } from "../hooks/use-agency-reports-surface";

export type AgencyReportsSurfaceContainerProps = {
  teamId: string;
};

export function AgencyReportsSurfaceContainer({ teamId }: AgencyReportsSurfaceContainerProps) {
  const vm = useAgencyReportsSurface({ teamId });
  return (
    <>
      <AgencyReportsStudioView
        options={vm.options}
        activityMenu={
          vm.recipeId ? (
            <AgencyReportActivityMenu teamId={vm.teamId} reportId={vm.recipeId} align="end" />
          ) : null
        }
        document={vm.document}
      />
      {vm.detailsOpen ? (
        <AgencyReportEntryDetailsDialog
          teamId={vm.teamId}
          entries={vm.detailsEntries}
          title={vm.detailsLabel}
          open={vm.detailsOpen}
          onOpenChange={vm.onDetailsOpenChange}
        />
      ) : null}
    </>
  );
}
