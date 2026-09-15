import { AlertTriangle } from "lucide-react";

import { AgencyTimeEntryDayGroupView } from "@/features/time-tracking/entries/agency-time-entry-day-group-view";
import { AgencyTimeEntryWeekHeaderView } from "@/features/time-tracking/entries/agency-time-entry-week-group-view";
import { AgencyWorkSurfacePaginationFooter } from "@/features/task-management/work-surface/agency-work-surface-pagination-footer";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import type { AgencyTimeEntriesLogViewModel } from "@/features/time-tracking/hooks/use-agency-time-entries-log";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";
import { agencyMetricClass, agencyWorkTableBodyScrollClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeEntriesLogViewProps = {
  view: AgencyTimeEntriesLogViewModel;
  renderGroupRow: AgencyTimeEntryGroupRowRenderer;
};

export function AgencyTimeEntriesLogView({ view, renderGroupRow }: AgencyTimeEntriesLogViewProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", view.className)}>
      {view.logQueryError ? (
        <div className="mx-4 mt-4 border border-error/30 bg-error/5 p-4 text-sm" role="alert">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-highlighted">Couldn't load entries</p>
              <p className="mt-1 text-muted">{view.logQueryError}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={view.onRetry}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={view.scrollContainerRef} className={agencyWorkTableBodyScrollClass}>
        {view.pinnedWeekOverlay ? (
          <div className="sticky top-0 z-20 h-0 overflow-visible">
            <AgencyTimeEntryWeekHeaderView
              label={view.pinnedWeekOverlay.label}
              totalSeconds={view.pinnedWeekOverlay.totalSeconds}
              weekStartKey={view.pinnedWeekOverlay.weekStartKey}
              isPinned
            />
          </div>
        ) : null}
        {view.isLoading ? (
          <SurfaceShimmer className="min-h-64 rounded-none" label="Loading time entries" />
        ) : view.entriesEmpty ? (
          <div className="border-b border-dashed border-default bg-elevated/25 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-highlighted">No time logged yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Start the tracker, write a short description, and choose a task before stopping.
            </p>
            <ol className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm text-muted">
              <li className="flex gap-2">
                <span className={cn(agencyMetricClass, "text-xs")}>1.</span>
                <span>Press Start</span>
              </li>
              <li className="flex gap-2">
                <span className={cn(agencyMetricClass, "text-xs")}>2.</span>
                <span>Describe your work</span>
              </li>
              <li className="flex gap-2">
                <span className={cn(agencyMetricClass, "text-xs")}>3.</span>
                <span>Choose a task</span>
              </li>
            </ol>
            <Button
              variant="secondary"
              size="sm"
              className="mt-5"
              onClick={view.onRequestOpenTaskChooser}
            >
              Choose task
            </Button>
          </div>
        ) : (
          <div
            className="relative min-h-full bg-background"
            style={{ height: `${view.virtualTotalSize}px` }}
          >
            {view.virtualItems.map((virtualItem) => {
              const item = view.virtualDays[virtualItem.index];
              if (!item) return null;
              return (
                <div
                  key={virtualItem.key}
                  ref={view.measureVirtualDay}
                  data-index={virtualItem.index}
                  className="absolute top-0 left-0 w-full pb-[20px]"
                  style={{ transform: `translateY(${virtualItem.start}px)` }}
                >
                  {item.week ? (
                    <AgencyTimeEntryWeekHeaderView
                      label={item.week.label}
                      totalSeconds={item.week.totalSeconds}
                      weekStartKey={item.week.weekStartKey}
                      isPinned={view.pinnedWeekKeys.has(item.week.weekStartKey)}
                    />
                  ) : null}
                  <AgencyTimeEntryDayGroupView
                    teamId={view.teamId}
                    day={item.day}
                    renderGroupRow={renderGroupRow}
                    selectedEntryIds={view.selectedEntryIds}
                    bulkEditActive={view.bulkEditDayKey === item.day.dateKey}
                    bulkFieldEditOpen={
                      view.bulkFieldEditOpen && view.bulkEditDayKey === item.day.dateKey
                    }
                    bulkDraft={view.bulkDraft}
                    onBulkDraftChange={view.onBulkDraftChange}
                    onToggleEntrySelected={view.onToggleEntrySelected}
                    onToggleDayBulkEdit={view.onToggleDayBulkEdit}
                    onToggleBulkFieldEdit={view.onToggleBulkFieldEdit}
                    onDeleteSelected={view.onDeleteSelected}
                    onMarkSelectedAsWaste={view.onMarkSelectedAsWaste}
                    onApplyBulk={view.onApplyBulk}
                    onCreateTag={view.onCreateTag}
                    tagCreatePending={view.tagCreatePending}
                    tags={view.tags}
                    projects={view.projects}
                    tasks={view.tasks}
                    wastePending={view.wastePending}
                  />
                </div>
              );
            })}
          </div>
        )}
        {view.showPagination ? (
          <AgencyWorkSurfacePaginationFooter
            rangeStart={view.rangeStart}
            rangeEnd={view.rangeEnd}
            total={view.totalEntries}
            previousDisabled={view.page <= 1}
            nextDisabled={view.page >= view.maxPage}
            onPrevious={view.onPreviousPage}
            onNext={view.onNextPage}
            pageSize={view.pageSize}
            pageSizeOptions={view.pageSizeOptions}
            onPageSizeChange={view.onPageSizeChange}
          />
        ) : null}
      </div>
    </div>
  );
}
