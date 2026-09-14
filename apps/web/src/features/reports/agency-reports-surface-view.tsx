import { AlertTriangle, BarChart2 } from "lucide-react";

import { AgencyReportHourMetricsRow } from "@/features/reports/agency-report-hour-metrics-row";
import { AgencyReportsTable } from "@/features/reports/agency-reports-table";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";
import type { AgencyReportsSurfaceViewModel } from "./hooks/use-agency-reports-surface";

export type AgencyReportsSurfaceViewProps = {
  vm: AgencyReportsSurfaceViewModel;
};

export function AgencyReportsSurfaceView({ vm }: AgencyReportsSurfaceViewProps) {
  if (vm.isPending) {
    return <SurfaceShimmer className="min-h-80" label="Loading reports" />;
  }

  if (vm.isError) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-semibold text-highlighted">Couldn't load reports.</p>
        <p className="mt-1 text-xs text-muted">{vm.error}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={vm.refetch}>
          Retry
        </Button>
      </div>
    );
  }

  if (vm.entries.length === 0) {
    return (
      <div className={agencyEmptyPanelClass}>
        <BarChart2 className="mx-auto size-7 text-muted" />
        <p className="mt-4 text-sm font-semibold text-highlighted">No time in this range.</p>
        <p className="mt-1 text-xs text-muted">Start a timer, or widen the dates above.</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={vm.onGoToTracker}>
          Open Tracker
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AgencyReportHourMetricsRow
        metrics={vm.hourMetrics}
        caption="Edit time below. Export with Create report."
      />
      <AgencyReportsTable
        teamId={vm.teamId}
        entries={vm.entries}
        clientGroups={vm.clientGroups}
        clients={vm.clients}
        visibleFields={vm.visibleFields}
        footer={null}
        projects={vm.projects}
        tasks={vm.tasks}
        tasksLoading={vm.tasksLoading}
        updatingRowKeys={vm.updatingRowKeys}
        savedRowKeys={vm.savedRowKeys}
        deletingEntryIds={vm.deletingEntryIds}
        onTaskChange={vm.onTaskChange}
        onDescriptionChange={vm.onDescriptionChange}
        onLinksChange={vm.onLinksChange}
        onEditDetails={vm.onEditDetails}
        onDeleteRow={vm.onDeleteRow}
        onToggleWaste={vm.onToggleWaste}
        onAskOrchWaste={vm.onAskOrchWaste}
      />
    </div>
  );
}
