import { AlertTriangle, BarChart2 } from "lucide-react";
import type { ReactNode } from "react";

import {
  AgencyReportDocumentPreview,
  type AgencyReportDocumentPreviewProps,
} from "@/features/reports/agency-report-document-preview";
import {
  AgencyReportStudioOptionsView,
  type AgencyReportStudioOptionsViewProps,
} from "@/features/reports/agency-report-studio-options-view";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";

export type AgencyReportsStudioViewProps = {
  options: Omit<AgencyReportStudioOptionsViewProps, "activityMenu">;
  activityMenu: ReactNode;
  document: {
    isPending: boolean;
    isError: boolean;
    error: string;
    onRetry: () => void;
    isEmpty: boolean;
    onGoToTracker: () => void;
  } & AgencyReportDocumentPreviewProps;
};

export function AgencyReportsStudioView({
  options,
  activityMenu,
  document,
}: AgencyReportsStudioViewProps) {
  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <aside className="min-w-0 lg:sticky lg:top-4">
        <AgencyReportStudioOptionsView {...options} activityMenu={activityMenu} />
      </aside>
      <div className="min-w-0">
        {document.isPending ? (
          <SurfaceShimmer className="min-h-80" label="Loading report" />
        ) : document.isError ? (
          <div className={agencyErrorPanelClass} role="alert">
            <AlertTriangle className="mx-auto size-5 text-error" />
            <p className="mt-3 text-sm font-semibold text-highlighted">Couldn't load preview.</p>
            <p className="mt-1 text-xs text-muted">{document.error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={document.onRetry}>
              Retry
            </Button>
          </div>
        ) : document.isEmpty ? (
          <div className={agencyEmptyPanelClass}>
            <BarChart2 className="mx-auto size-7 text-muted" />
            <p className="mt-4 text-sm font-semibold text-highlighted">No time in this range.</p>
            <p className="mt-1 text-xs text-muted">Start a timer, or widen the dates in Scope.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={document.onGoToTracker}>
              Open Tracker
            </Button>
          </div>
        ) : (
          <AgencyReportDocumentPreview
            visibleFields={document.visibleFields}
            rangeFrom={document.rangeFrom}
            rangeTo={document.rangeTo}
            totalSeconds={document.totalSeconds}
            totalEntries={document.totalEntries}
            chapterScrollRef={document.chapterScrollRef}
            outline={document.outline}
            stickyChapter={document.stickyChapter}
            onJumpToClient={document.onJumpToClient}
            onChapterScroll={document.onChapterScroll}
            virtualChapters={document.virtualChapters}
            virtualTotalSize={document.virtualTotalSize}
            measureChapter={document.measureChapter}
            onEditDetails={document.onEditDetails}
            onExcludeRow={document.onExcludeRow}
            canUndo={document.canUndo}
            canRedo={document.canRedo}
            onUndo={document.onUndo}
            onRedo={document.onRedo}
          />
        )}
      </div>
    </div>
  );
}
