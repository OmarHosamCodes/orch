import { motion } from "motion/react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";
import { AgencyTimeEntryWeekGroupView } from "@/features/time-tracking/entries/agency-time-entry-week-group-view";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";
import {
  agencyEmptyPanelClass,
  agencyTimeWeekStackClass,
  agencyWorkTableBodyScrollClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import type { AgencyReportEntryDetailsDialogViewModel } from "@/features/reports/hooks/use-agency-report-entry-details-dialog";

type AgencyReportEntryDetailsDialogViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewModel: AgencyReportEntryDetailsDialogViewModel;
  renderGroupRow: AgencyTimeEntryGroupRowRenderer;
};

export function AgencyReportEntryDetailsDialogView({
  open,
  onOpenChange,
  viewModel,
  renderGroupRow,
}: AgencyReportEntryDetailsDialogViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-default px-4 py-3 pr-14 text-left">
          <DialogTitle className="truncate text-base font-semibold tracking-tight text-highlighted">
            {viewModel.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            {viewModel.description}
          </DialogDescription>
        </DialogHeader>

        {viewModel.entriesEmpty ? (
          <div className={cn(agencyEmptyPanelClass, "m-5")}>
            <p className="text-sm font-semibold text-highlighted">No entries left</p>
            <p className="mt-1 text-xs text-muted">These time entries were removed or moved.</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={viewModel.onClose}>
              Close
            </Button>
          </div>
        ) : (
          <motion.div
            className={cn(
              agencyWorkTableBodyScrollClass,
              "max-h-[calc(85vh-5.5rem)] px-4 pb-4 [&_.bg-background]:bg-transparent",
            )}
            initial={viewModel.prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
          >
            <div className={cn(agencyTimeWeekStackClass, "bg-transparent")}>
              {viewModel.weekGroups.map((week) => (
                <AgencyTimeEntryWeekGroupView
                  key={week.weekStartKey}
                  teamId={viewModel.teamId}
                  week={week}
                  renderGroupRow={renderGroupRow}
                  headerClassName="static min-h-0 border-0 bg-transparent px-3 py-1"
                  selectedEntryIds={viewModel.selectedEntryIds}
                  bulkEditDayKey={viewModel.bulkEditDayKey}
                  bulkFieldEditOpen={viewModel.bulkFieldEditOpen}
                  bulkDraft={viewModel.bulkDraft}
                  onBulkDraftChange={viewModel.onBulkDraftChange}
                  onToggleEntrySelected={viewModel.onToggleEntrySelected}
                  onToggleDayBulkEdit={viewModel.onToggleDayBulkEdit}
                  onToggleBulkFieldEdit={viewModel.onToggleBulkFieldEdit}
                  onDeleteSelected={viewModel.onDeleteSelected}
                  onMarkSelectedAsWaste={viewModel.onMarkSelectedAsWaste}
                  onApplyBulk={viewModel.onApplyBulk}
                  onCreateTag={viewModel.onCreateTag}
                  tagCreatePending={viewModel.tagCreatePending}
                  tags={viewModel.tags}
                  projects={viewModel.projects}
                  tasks={viewModel.tasks}
                  wastePending={viewModel.wastePending}
                />
              ))}
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
