import { AlertTriangle, BarChart2 } from "lucide-react";
import type { ReactNode } from "react";

import { AgencyReportCreatorHeader } from "@/features/reports/creator/agency-report-creator-header";
import { AgencyReportHourMetricsRow } from "@/features/reports/agency-report-hour-metrics-row";
import { AgencyReportCreatorTable } from "@/features/reports/creator/agency-report-creator-table";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";
import type { AgencyReportCreatorSurfaceViewModel } from "./hooks/use-agency-report-creator-surface";

export type AgencyReportCreatorSurfaceViewProps = {
  vm: AgencyReportCreatorSurfaceViewModel;
  activityMenu: ReactNode;
};

export function AgencyReportCreatorSurfaceView({
  vm,
  activityMenu,
}: AgencyReportCreatorSurfaceViewProps) {
  if (!vm.reportId) {
    return (
      <div className={agencyEmptyPanelClass}>
        <BarChart2 className="mx-auto size-7 text-muted" />
        <p className="mt-4 text-sm font-semibold text-highlighted">No report selected.</p>
        <p className="mt-1 text-xs text-muted">Go back to Reports to create or open one.</p>
      </div>
    );
  }

  if (vm.isPending || (vm.report && vm.rangeReady && vm.entriesQueryPending)) {
    return <SurfaceShimmer className="min-h-80" label="Loading report" />;
  }

  if (vm.isError || !vm.report) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-semibold text-highlighted">Couldn't load report.</p>
        <p className="mt-1 text-xs text-muted">{vm.errorMessage}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={vm.onBackToReports}>
          Back to Reports
        </Button>
      </div>
    );
  }

  return (
    <div className="agency-report-creator space-y-4">
      <AgencyReportCreatorHeader
        onBack={vm.onBackToReports}
        reportName={vm.reportName}
        fallbackName={vm.report.name}
        onReportNameChange={vm.setReportName}
        onRenameCommitted={vm.handleRenameCommitted}
        report={{
          rangeFrom: vm.report.rangeFrom,
          rangeTo: vm.report.rangeTo,
          clientId: vm.report.clientId,
          projectId: vm.report.projectId,
          memberUserId: vm.report.memberUserId,
          createdByUserName: vm.report.createdByUserName,
        }}
        labelContext={vm.labelContext}
        visibleEntryCount={vm.creator.visibleEntries.length}
        canUndo={vm.creator.canUndo}
        onUndo={vm.handleUndoExclude}
        autosaveState={vm.autosave.state}
        lastSavedAt={vm.autosave.lastSavedAt}
        onRetrySave={vm.autosave.retry}
        exportPhase={vm.exportPhase}
        onExport={(mode) => void vm.handleExport(mode)}
        viewOptions={{
          fieldIds: vm.visibleFields,
          onFieldIdsChange: vm.onFieldIdsChange,
          showWaste: vm.showWaste,
          onShowWasteChange: vm.onShowWasteChange,
          mergeSameTaskNames: vm.mergeSameTaskNames,
          onMergeSameTaskNamesChange: vm.onMergeSameTaskNamesChange,
        }}
        activityMenu={activityMenu}
        deletingReport={vm.deletingReport}
        onDeleteReport={() => void vm.handleDeleteReport()}
      />

      {!vm.rangeReady ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-semibold text-highlighted">Dates are missing.</p>
          <p className="mt-1 text-xs text-muted">This report needs a date range to show hours.</p>
        </div>
      ) : vm.entriesQueryError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-semibold text-highlighted">Couldn't load entries.</p>
          <p className="mt-1 text-xs text-muted">{vm.entriesQueryErrorMessage}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={vm.refetchEntries}>
            Retry
          </Button>
        </div>
      ) : vm.creator.visibleEntries.length === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-semibold text-highlighted">No entries left.</p>
          <p className="mt-1 text-xs text-muted">
            Undo a removal, or go back and change the filters.
          </p>
        </div>
      ) : (
        <>
          <AgencyReportHourMetricsRow
            metrics={vm.hourMetrics}
            caption="This preview matches your export."
          />
          <AgencyReportCreatorTable
            creator={vm.creator}
            clients={vm.clients}
            visibleFields={vm.visibleFields}
            mergeSameTaskNames={vm.mergeSameTaskNames}
            rangeFrom={vm.report.rangeFrom}
            rangeTo={vm.report.rangeTo}
            onSaveEdit={vm.handleSaveEdit}
            onExcludeEntry={vm.handleExcludeEntry}
            onToggleWaste={(entryIds) => void vm.handleToggleWaste(entryIds)}
            savingEntryId={vm.savingEntryId}
          />
        </>
      )}
    </div>
  );
}
